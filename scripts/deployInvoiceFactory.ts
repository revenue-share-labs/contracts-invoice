import { ethers } from "hardhat";

async function main() {
  const InvoiceFactory = await ethers.getContractFactory("InvoiceFactory");
  const invoiceFactory = await InvoiceFactory.deploy();
  await invoiceFactory.deployed();

  console.log("RSCValveFactory deployed to: ", invoiceFactory.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
