const PaymentProcessor = artifacts.require("PaymentProcessor");

module.exports = async function(deployer, network, accounts) {
  await deployer.deploy(PaymentProcessor);
  console.log(`Contract deployed by: ${accounts[0]}`);
};
