import { motion } from "framer-motion";
import { useCartStore } from "../stores/useCartStore";
import { Link, useNavigate } from "react-router-dom";
import { MoveRight, Wallet, ArrowUp, ArrowDown, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import axios from "../lib/axios";
import Web3 from 'web3';
import PaymentProcessor from '../contracts/PaymentProcessor.json';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Supported ERC-20 tokens with conversion rates (simulated)
const SUPPORTED_TOKENS = [
	{ symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000', decimals: 18, conversionRate: 1 },
	{ symbol: 'USDT', name: 'Tether', address: import.meta.env.VITE_USDT_TOKEN_ADDRESS, decimals: 6, conversionRate: 0.0005 }, // Example: 1 USDT = 0.0005 ETH
];

// Supported currencies with conversion rates (simulated)
const SUPPORTED_CURRENCIES = [
	{ code: 'USD', symbol: '$', name: 'US Dollar', conversionRate: 1 },
	{ code: 'INR', symbol: '₹', name: 'Indian Rupee', conversionRate: 83.24 }, // 1 USD = 83.24 INR (example rate)
];

const OrderSummary = () => {
	const { total, subtotal, coupon, isCouponApplied, cart, clearCart } = useCartStore();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);
	const [paymentMethod, setPaymentMethod] = useState('traditional'); // 'traditional' or 'crypto'
	const [walletAddress, setWalletAddress] = useState('');
	const [selectedToken, setSelectedToken] = useState(SUPPORTED_TOKENS[0]); // Default to ETH
	const [gasPrice, setGasPrice] = useState(null);
	const [gasPriceOptions, setGasPriceOptions] = useState({ slow: null, medium: null, fast: null });
	const [selectedGasPrice, setSelectedGasPrice] = useState('medium');
	const [tokenAmount, setTokenAmount] = useState(0);
	const [selectedCurrency, setSelectedCurrency] = useState(SUPPORTED_CURRENCIES[0]); // Default to USD
	const navigate = useNavigate();

	const savings = subtotal - total;
	
	// Format amounts according to selected currency
	const formatCurrency = (amount) => {
		const convertedAmount = amount * selectedCurrency.conversionRate;
		return `${selectedCurrency.symbol}${convertedAmount.toFixed(2)}`;
	};
	
	const formattedSubtotal = formatCurrency(subtotal);
	const formattedTotal = formatCurrency(total);
	const formattedSavings = formatCurrency(savings);

	// Calculate token amount based on selected token
	useEffect(() => {
		if (selectedToken) {
			// Convert USD price to token amount
			const amount = total / (selectedToken.symbol === 'ETH' 
				? getCurrentEthPrice() 
				: getCurrentEthPrice() / selectedToken.conversionRate);
			
			setTokenAmount(amount);
		}
	}, [total, selectedToken]);

	// Connect to MetaMask
	const connectWallet = async () => {
		try {
			if (!window.ethereum) {
				setError('Please install MetaMask to make crypto payments');
				return;
			}

			const accounts = await window.ethereum.request({
				method: 'eth_requestAccounts'
			});
			setWalletAddress(accounts[0]);
			
			// Fetch gas prices after connecting
			fetchGasPrices();
		} catch (error) {
			console.error('Error connecting wallet:', error);
			setError('Failed to connect wallet');
		}
	};
	
	// Fetch current gas prices
	const fetchGasPrices = async () => {
		try {
			const web3 = new Web3(window.ethereum);
			
			// Get current gas price from the network
			const currentGasPrice = await web3.eth.getGasPrice();
			const gasPriceGwei = web3.utils.fromWei(currentGasPrice, 'gwei');
			setGasPrice(gasPriceGwei);
			
			// Calculate slow, medium, and fast options
			const slow = Math.floor(parseFloat(gasPriceGwei) * 0.8);
			const medium = Math.floor(parseFloat(gasPriceGwei) * 1.0);
			const fast = Math.floor(parseFloat(gasPriceGwei) * 1.5);
			
			setGasPriceOptions({
				slow: { price: slow, time: '5-10 min' },
				medium: { price: medium, time: '2-5 min' },
				fast: { price: fast, time: '< 2 min' }
			});
		} catch (error) {
			console.error('Error fetching gas prices:', error);
		}
	};
	
	// Simulated function to get current ETH price in USD
	const getCurrentEthPrice = () => {
		// In a real app, this would fetch from a price feed API
		return 2500; // Example: 1 ETH = $2500 USD
	};

	// Process crypto payment
	const processCryptoPayment = async () => {
		try {
			setIsLoading(true);
			setError(null);

			if (!window.ethereum) {
				throw new Error('Please install MetaMask');
			}

			const web3 = new Web3(window.ethereum);
			
			// Get the network to determine the contract address
			const networkId = await web3.eth.net.getId();
			const contractAddress = import.meta.env.VITE_PAYMENT_PROCESSOR_ADDRESS;
			
			if (!contractAddress) {
				throw new Error('Payment processor contract address not configured');
			}

			const contract = new web3.eth.Contract(
				PaymentProcessor.abi,
				contractAddress
			);

			// Generate payment ID
			const paymentId = web3.utils.sha3(Date.now().toString() + walletAddress);
			
			// Set gas price based on user selection
			const selectedGasPriceWei = web3.utils.toWei(
				gasPriceOptions[selectedGasPrice].price.toString(),
				'gwei'
			);
			
			let tx;
			
			// Check if using native ETH or ERC-20 token
			if (selectedToken.symbol === 'ETH') {
				// Convert total to Wei (assuming the price is in ETH)
				const totalInWei = web3.utils.toWei(tokenAmount.toString(), 'ether');
				
				// Process payment through smart contract with ETH
				tx = await contract.methods.processPayment(paymentId).send({
					from: walletAddress,
					value: totalInWei,
					gasPrice: selectedGasPriceWei
				});
			} else {
				// For ERC-20 tokens
				// Get token contract
				const tokenContract = new web3.eth.Contract(
					[
						// ERC-20 approve and transferFrom methods
						{
							"constant": false,
							"inputs": [
								{ "name": "_spender", "type": "address" },
								{ "name": "_value", "type": "uint256" }
							],
							"name": "approve",
							"outputs": [{ "name": "", "type": "bool" }],
							"payable": false,
							"stateMutability": "nonpayable",
							"type": "function"
						}
					],
					selectedToken.address
				);
				
				// Calculate token amount with correct decimals
				const tokenDecimals = selectedToken.decimals;
				const tokenAmountWithDecimals = (tokenAmount * Math.pow(10, tokenDecimals)).toString();
				
				// First approve the contract to spend tokens
				await tokenContract.methods.approve(contractAddress, tokenAmountWithDecimals).send({
					from: walletAddress,
					gasPrice: selectedGasPriceWei
				});
				
				// Process token payment
				tx = await contract.methods.processTokenPayment(
					selectedToken.address,
					tokenAmountWithDecimals,
					paymentId
				).send({
					from: walletAddress,
					gasPrice: selectedGasPriceWei
				});
			}

			// Verify payment on backend
			const response = await axios.post("/payments/verify-crypto-payment", {
				products: cart,
				paymentId,
				walletAddress,
				transactionHash: tx.transactionHash,
				amount: total,
				tokenAddress: selectedToken.symbol === 'ETH' ? null : selectedToken.address,
				currency: selectedCurrency.code
			});

			if (response.data.success) {
				clearCart();
				navigate(`/purchase-success?orderId=${response.data.orderId}`);
			} else {
				throw new Error(response.data.message || 'Payment verification failed');
			}
		} catch (error) {
			console.error('Crypto payment error:', error);
			setError(error.message || 'Failed to process crypto payment');
		} finally {
			setIsLoading(false);
		}
	};

	// Process traditional payment
	const processTraditionalPayment = async () => {
		try {
			setIsLoading(true);
			setError(null);

			const response = await axios.post('/payments/create-checkout-session', {
				products: cart,
				couponCode: isCouponApplied ? coupon.code : null,
				currency: selectedCurrency.code.toLowerCase()
			});

			const stripe = await stripePromise;
			const { error } = await stripe.redirectToCheckout({
				sessionId: response.data.id,
			});

			if (error) throw new Error(error.message);
		} catch (error) {
			console.error('Traditional payment error:', error);
			setError('Failed to initialize payment. Please try again later.');
		} finally {
			setIsLoading(false);
		}
	};

	const handlePaymentSubmit = (e) => {
		e.preventDefault();
		if (paymentMethod === 'traditional') {
			processTraditionalPayment();
		} else {
			processCryptoPayment();
		}
	};

	return (
		<motion.div 
			className="p-4 bg-gray-800 border border-gray-700 shadow-md rounded-lg text-white"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
		>
			<h2 className="text-xl font-semibold mb-4 text-emerald-400">Order Summary</h2>
			
			{/* Currency Selection */}
			<div className="mb-3 flex items-center justify-end">
				<div className="flex items-center gap-2">
					<Globe className="w-4 h-4 text-gray-400" />
					<select 
						className="text-sm px-2 py-1 rounded bg-gray-700 border-gray-600 text-white focus:ring-emerald-500 focus:border-emerald-500"
						value={selectedCurrency.code}
						onChange={(e) => setSelectedCurrency(SUPPORTED_CURRENCIES.find(c => c.code === e.target.value))}
					>
						{SUPPORTED_CURRENCIES.map(currency => (
							<option key={currency.code} value={currency.code}>
								{currency.code} ({currency.symbol})
							</option>
						))}
					</select>
				</div>
			</div>
			
			{/* Price Summary */}
			<div className="mb-4 space-y-2">
				<div className="flex justify-between">
					<span className="text-gray-300">Subtotal</span>
					<span>{formattedSubtotal}</span>
				</div>
				{isCouponApplied && (
					<div className="flex justify-between">
						<span className="text-gray-300">Savings</span>
						<span className="text-emerald-400">- {formattedSavings}</span>
					</div>
				)}
				<div className="flex justify-between font-semibold border-t border-gray-600 pt-2">
					<span>Total</span>
					<span className="text-emerald-400">{formattedTotal}</span>
				</div>
				
				{/* Show token amount if crypto payment method selected */}
				{paymentMethod === 'crypto' && selectedToken && (
					<div className="flex justify-between border-t border-gray-600 pt-2">
						<span className="text-gray-300">Pay with {selectedToken.symbol}</span>
						<span className="text-emerald-400">{tokenAmount.toFixed(6)} {selectedToken.symbol}</span>
					</div>
				)}
				
				{/* Show conversion rate if INR is selected */}
				{selectedCurrency.code === 'INR' && (
					<div className="text-xs text-gray-400 text-right mt-1">
						(1 USD = {selectedCurrency.conversionRate} INR)
					</div>
				)}
			</div>
			
			{/* Payment Method Selection */}
			<div className="mb-4">
				<h3 className="font-medium mb-2 text-gray-300">Payment Method</h3>
				<div className="flex space-x-2">
					<button
						className={`px-3 py-2 rounded ${paymentMethod === 'traditional' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300'}`}
						onClick={() => setPaymentMethod('traditional')}
					>
						Credit Card
					</button>
					<button
						className={`px-3 py-2 rounded flex items-center ${paymentMethod === 'crypto' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300'}`}
						onClick={() => setPaymentMethod('crypto')}
					>
						<Wallet className="w-4 h-4 mr-1" /> Crypto
					</button>
				</div>
			</div>
			
			{/* Indian payment methods when INR selected */}
			{selectedCurrency.code === 'INR' && paymentMethod === 'traditional' && (
				<div className="mb-4 p-3 bg-gray-700 rounded border border-gray-600">
					<h3 className="font-medium mb-2 text-emerald-400">Indian Payment Options</h3>
					<div className="space-y-2">
						<label className="flex items-center space-x-2">
							<input 
								type="radio" 
								name="indianPaymentMethod" 
								defaultChecked 
								className="text-emerald-500 focus:ring-emerald-500" 
							/>
							<span>UPI / Google Pay / PhonePe</span>
						</label>
						<label className="flex items-center space-x-2">
							<input 
								type="radio" 
								name="indianPaymentMethod" 
								className="text-emerald-500 focus:ring-emerald-500" 
							/>
							<span>Net Banking</span>
						</label>
						<label className="flex items-center space-x-2">
							<input 
								type="radio" 
								name="indianPaymentMethod" 
								className="text-emerald-500 focus:ring-emerald-500" 
							/>
							<span>Credit/Debit Card</span>
						</label>
					</div>
				</div>
			)}
			
			{/* Crypto payment options */}
			{paymentMethod === 'crypto' && (
				<div className="mb-4 space-y-4">
					{/* Wallet Connection */}
					{!walletAddress ? (
						<button
							className="w-full py-2 bg-blue-600 text-white rounded flex items-center justify-center hover:bg-blue-700 transition-colors"
							onClick={connectWallet}
						>
							<Wallet className="w-4 h-4 mr-2" /> Connect Wallet
						</button>
					) : (
						<div className="p-2 bg-gray-700 rounded">
							<span className="text-sm text-gray-300">Connected: {walletAddress.substring(0, 6)}...{walletAddress.substring(38)}</span>
						</div>
					)}
					
					{/* Token Selection */}
					{walletAddress && (
						<div>
							<label className="block text-sm font-medium mb-1 text-gray-300">Select Token</label>
							<select 
								className="w-full p-2 border rounded bg-gray-700 border-gray-600 text-white focus:ring-emerald-500 focus:border-emerald-500"
								value={selectedToken.symbol}
								onChange={(e) => setSelectedToken(SUPPORTED_TOKENS.find(t => t.symbol === e.target.value))}
							>
								{SUPPORTED_TOKENS.map(token => (
									<option key={token.symbol} value={token.symbol}>
										{token.name} ({token.symbol})
									</option>
								))}
							</select>
						</div>
					)}
					
					{/* Gas Price Selection */}
					{walletAddress && gasPrice && (
						<div>
							<label className="block text-sm font-medium mb-1 text-gray-300">Transaction Speed</label>
							<div className="grid grid-cols-3 gap-2">
								<button 
									className={`p-2 text-xs rounded border ${selectedGasPrice === 'slow' ? 'border-emerald-500 bg-gray-700' : 'border-gray-600 bg-gray-700 text-gray-300'}`}
									onClick={() => setSelectedGasPrice('slow')}
								>
									<div className="font-medium">Slow</div>
									<div className="text-gray-400">{gasPriceOptions.slow.price} Gwei</div>
									<div className="text-gray-400">{gasPriceOptions.slow.time}</div>
								</button>
								<button 
									className={`p-2 text-xs rounded border ${selectedGasPrice === 'medium' ? 'border-emerald-500 bg-gray-700' : 'border-gray-600 bg-gray-700 text-gray-300'}`}
									onClick={() => setSelectedGasPrice('medium')}
								>
									<div className="font-medium">Medium</div>
									<div className="text-gray-400">{gasPriceOptions.medium.price} Gwei</div>
									<div className="text-gray-400">{gasPriceOptions.medium.time}</div>
								</button>
								<button 
									className={`p-2 text-xs rounded border ${selectedGasPrice === 'fast' ? 'border-emerald-500 bg-gray-700' : 'border-gray-600 bg-gray-700 text-gray-300'}`}
									onClick={() => setSelectedGasPrice('fast')}
								>
									<div className="font-medium">Fast</div>
									<div className="text-gray-400">{gasPriceOptions.fast.price} Gwei</div>
									<div className="text-gray-400">{gasPriceOptions.fast.time}</div>
								</button>
							</div>
						</div>
					)}
					
					{/* Real-time conversion rate */}
					{walletAddress && (
						<div className="text-sm text-gray-300 p-2 bg-gray-700 rounded border border-gray-600">
							<div className="flex justify-between">
								<span>1 {selectedToken.symbol}</span>
								<span>= ${selectedToken.symbol === 'ETH' ? getCurrentEthPrice() : getCurrentEthPrice() / selectedToken.conversionRate}</span>
							</div>
						</div>
					)}
				</div>
			)}
			
			{/* Error message */}
			{error && (
				<div className="text-red-400 text-sm mb-4 p-2 bg-red-900/30 border border-red-700 rounded">
					{error}
				</div>
			)}
			
			{/* Submit Button */}
			<button
				onClick={handlePaymentSubmit}
				disabled={isLoading || (paymentMethod === 'crypto' && !walletAddress)}
				className={`w-full py-3 rounded flex items-center justify-center ${
					isLoading || (paymentMethod === 'crypto' && !walletAddress)
						? 'bg-gray-600 cursor-not-allowed'
						: 'bg-emerald-600 text-white hover:bg-emerald-700 transition-colors'
				}`}
			>
				{isLoading ? (
					'Processing...'
				) : (
					<>
						Proceed to Payment <MoveRight className="ml-2 w-4 h-4" />
					</>
				)}
			</button>
			
			{/* Alternative action */}
			<div className="mt-3 flex items-center justify-center gap-2">
				<span className="text-sm text-gray-400">or</span>
				<Link to="/" className="text-sm text-emerald-400 hover:underline flex items-center">
					Continue Shopping <MoveRight className="ml-1 w-3 h-3" />
				</Link>
			</div>
		</motion.div>
	);
};

export default OrderSummary;
