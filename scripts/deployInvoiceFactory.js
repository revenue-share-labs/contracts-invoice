const { ethers } = require("hardhat");

async function main() {
  const invoiceFactory = await ethers.getContractFactory("InvoiceFactory");
  const InvoiceFactory = await invoiceFactory.deploy();
  await InvoiceFactory.deployed();

  console.log("InvoiceFactory deployed to: ", InvoiceFactory.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});