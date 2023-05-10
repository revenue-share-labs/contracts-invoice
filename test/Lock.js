const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

const provider = ethers.provider;
const signer = provider.getSigner();

describe("Testint Invoice", function () {
    async function deployFactory() {
        const accounts = await ethers.getSigners();

        const factory = await ethers.getContractFactory("InvoiceFactory");
        const InvoiceFactory = await factory.deploy();
        await InvoiceFactory.deployed();

        const token = await ethers.getContractFactory("TestToken");
        const TestToken = await token.deploy("TestToken", "TT", 1000000);
        await TestToken.deployed();

        return { InvoiceFactory, TestToken, accounts };
    }

    async function deployFactoryAndInvoiceToken() {
        const accounts = await ethers.getSigners();

        const factory = await ethers.getContractFactory("InvoiceFactory");
        const InvoiceFactory = await factory.deploy();
        await InvoiceFactory.deployed();

        const token = await ethers.getContractFactory("TestToken");
        const TestToken = await token.deploy("TestToken", "TT", 1000000);
        await TestToken.deployed();

        const distributors = [accounts[2].address, accounts[3].address];
        const initialRecipients = [
            accounts[4].address,
            accounts[5].address,
            accounts[6].address,
        ];
        const amounts = [
            ethers.utils.parseEther("1"),
            ethers.utils.parseEther("2"),
            ethers.utils.parseEther("3"),
        ];

        let RSCCreateData = [
            accounts[1].address,
            distributors,
            false,
            initialRecipients,
            TestToken.address,
            amounts,
            ethers.constants.HashZero,
        ];

        let tx = await InvoiceFactory.createInvoice(RSCCreateData);
        let receipt = await tx.wait();
        const invoiceAddress = receipt.events[3].args[0];

        const Invoice = await ethers.getContractAt(
            "Invoice",
            invoiceAddress,
            signer
        );

        return { Invoice, TestToken, accounts };
    }

    async function deployFactoryAndInvoiceEth() {
        const accounts = await ethers.getSigners();

        const factory = await ethers.getContractFactory("InvoiceFactory");
        const InvoiceFactory = await factory.deploy();
        await InvoiceFactory.deployed();

        const distributors = [accounts[2].address, accounts[3].address];
        const initialRecipients = [
            accounts[4].address,
            accounts[5].address,
            accounts[6].address,
        ];
        const amounts = [
            ethers.utils.parseEther("0.1"),
            ethers.utils.parseEther("0.2"),
            ethers.utils.parseEther("0.3"),
        ];

        let RSCCreateData = [
            accounts[1].address,
            distributors,
            false,
            initialRecipients,
            ethers.constants.AddressZero,
            amounts,
            ethers.constants.HashZero,
        ];
        
        let tx = await InvoiceFactory.createInvoice(RSCCreateData);
        let receipt = await tx.wait();
        const invoiceAddress = receipt.events[3].args[0];

        const Invoice = await ethers.getContractAt(
            "Invoice",
            invoiceAddress,
            signer
        );

        return { Invoice, accounts };
    }

    describe("Testing InvoiceFactory", async function () {
        it("Check InvoiceFactory data", async function () {
            const { InvoiceFactory, accounts } = await loadFixture(
                deployFactory
            );

            const owner = await InvoiceFactory.owner();
            const contractImplementation =
                await InvoiceFactory.contractImplementation();
            const platformFee = await InvoiceFactory.platformFee();
            const platformWallet = await InvoiceFactory.platformWallet();

            expect(owner).equal(accounts[0].address);
            expect(contractImplementation).not.equal(
                ethers.constants.AddressZero
            );
            expect(platformFee).equal(0);
            expect(platformWallet).equal(ethers.constants.AddressZero);
        });

        it("Set platformwallet and platformFee", async function () {
            const { InvoiceFactory, accounts } = await loadFixture(
                deployFactory
            );

            await InvoiceFactory.setPlatformFee(10000);
            await InvoiceFactory.setPlatformWallet(accounts[1].address);

            expect(await InvoiceFactory.platformFee()).not.equal(0);
            expect(await InvoiceFactory.platformWallet).not.equal(
                ethers.constants.AddressZero
            );
        });
    });

    describe("Testing Invoice", async function () {
        it("Test setter functions", async function () {
            const { Invoice, accounts } = await loadFixture(
                deployFactoryAndInvoiceToken
            );

            let numberOfRecipients = await Invoice.numberOfRecipients();
            expect(numberOfRecipients).equal(3);

            expect(
                Invoice.connect(accounts[1]).setDistributor(
                    accounts[2].address,
                    true
                )
            ).to.be.revertedWith("Ownable: caller is not the owner");

            expect(
                Invoice.connect(accounts[1]).setController(accounts[2].address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Test setRecipients", async function () {
            const { Invoice, accounts } = await loadFixture(
                deployFactoryAndInvoiceToken
            );
            let alice = accounts[7];
            let john = accounts[8];
            expect(
                Invoice.setRecipients([alice.address, john.address], [1, 2])
            ).to.be.revertedWithCustomError(Invoice, "OnlyControllerError");

            await Invoice.connect(accounts[1]).setRecipients(
                [accounts[4].address, accounts[5].address],
                [1, 2]
            );

            expect(await Invoice.numberOfRecipients()).to.be.equal(2);
            expect(await Invoice.totalAmount()).to.be.equal(3);

            await Invoice.lockRecipients();

            expect(
                Invoice.setRecipients(
                    [accounts[4].address, accounts[5].address],
                    [1, 2]
                )
            ).to.be.revertedWithCustomError(
                Invoice,
                "ImmutableRecipientsError"
            );
        });

        it("Distribute tokens without fee", async function () {
            const { Invoice, TestToken, accounts } = await loadFixture(
                deployFactoryAndInvoiceToken
            );

            expect(
                Invoice.redistributeNativeToken()
            ).to.be.revertedWithoutReason();

            expect(
                Invoice.connect(accounts[2]).redistributeToken()
            ).to.be.revertedWithoutReason();

            await TestToken.transfer(
                Invoice.address,
                ethers.utils.parseEther("6")
            );
            expect(Invoice.redistributeToken()).to.be.revertedWithCustomError(
                Invoice,
                "OnlyDistributorError"
            );
            await Invoice.connect(accounts[2]).redistributeToken();

            expect(await TestToken.balanceOf(accounts[4].address)).to.be.equal(
                ethers.utils.parseEther("1")
            );
            expect(await TestToken.balanceOf(accounts[5].address)).to.be.equal(
                ethers.utils.parseEther("2")
            );
            expect(await TestToken.balanceOf(accounts[6].address)).to.be.equal(
                ethers.utils.parseEther("3")
            );
        });

        it("Distribute native tokens without fee", async function () {
            const { Invoice, accounts } = await loadFixture(
                deployFactoryAndInvoiceEth
            );

            expect(Invoice.redistributeToken()).to.be.revertedWithoutReason();

            expect(
                Invoice.connect(accounts[2]).redistributeNativeToken()
            ).to.be.revertedWithoutReason();

            await accounts[9].sendTransaction({
                to: Invoice.address,
                value: ethers.utils.parseEther("0.6"),
            });

            expect(
                Invoice.redistributeNativeToken()
            ).to.be.revertedWithCustomError(Invoice, "OnlyDistributorError");

            let account4Balance = await accounts[4].getBalance();
            let account5Balance = await accounts[5].getBalance();
            let account6Balance = await accounts[6].getBalance();

            await Invoice.connect(accounts[2]).redistributeNativeToken();
            expect(
                await accounts[4].getBalance()
            ).to.be.equal(
                ethers.BigNumber.from(ethers.utils.parseEther("0.1")).add(account4Balance)
            );
            expect(
                await accounts[5].getBalance()
            ).to.be.equal(
                ethers.BigNumber.from(ethers.utils.parseEther("0.2")).add(account5Balance)
            );
            expect(
                await accounts[6].getBalance()
            ).to.be.equal(
                ethers.BigNumber.from(ethers.utils.parseEther("0.3")).add(account6Balance)
            );
        });
    });
});
