// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract PaymentProcessor {
    address public owner;
    mapping(bytes32 => bool) public payments;
    mapping(bytes32 => address) public paymentTokens;
    
    event PaymentProcessed(
        address payer,
        uint256 amount,
        bytes32 paymentId,
        uint256 date,
        address tokenAddress
    );

    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // Native ETH payment processing
    function processPayment(bytes32 paymentId) external payable {
        require(msg.value > 0, "Payment amount must be greater than 0");
        require(!payments[paymentId], "Payment has already been processed");

        payments[paymentId] = true;
        paymentTokens[paymentId] = address(0); // ETH payment
        
        emit PaymentProcessed(
            msg.sender,
            msg.value,
            paymentId,
            block.timestamp,
            address(0)
        );
    }

    function getPaymentStatus(bytes32 paymentId) external view returns (bool) {
        return payments[paymentId];
    }
    
    function getPaymentToken(bytes32 paymentId) external view returns (address) {
        return paymentTokens[paymentId];
    }

    // Basic withdrawal function
    function withdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}
