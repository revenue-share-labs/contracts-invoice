import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import {
  Invoice,
  InvoiceFactory,
  InvoiceFactory__factory,
  TestToken,
  TestToken__factory,
  MockReceiver,
  MockReceiver__factory,
} from "../typechain-types";
import { snapshot } from "./utils";

describe("Invoice", function () {
  let invoiceFactory: InvoiceFactory,
    invoice: Invoice,
    testToken: TestToken,
    mockReceiver: MockReceiver,
    owner: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    addr3: SignerWithAddress,
    addr4: SignerWithAddress,
    addr5: SignerWithAddress,
    snapId: string;

  async function deployInvoice(
    controller: any,
    distributors: any,
    isImmutableRecipients: any,
    recipientsData: any,
    token: any,
    creationId: any
  ) {
    const tx = await invoiceFactory.createInvoice({
      controller,
      distributors,
      isImmutableRecipients,
      recipientsData,
      token,
      creationId,
    });
    const receipt = await tx.wait();

    const invoiceContractAddress = receipt.events?.[3].args?.[0];
    
    const InvoiceContract = await ethers.getContractFactory("Invoice");
    const Invoice = await InvoiceContract.attach(
      invoiceContractAddress
    );
    return Invoice;
  }

  before(async () => {
    [owner, alice, bob, addr3, addr4, addr5] = await ethers.getSigners();
    invoiceFactory = await new InvoiceFactory__factory(owner).deploy();
    testToken = await new TestToken__factory(owner).deploy();

    invoice = await deployInvoice(
      owner.address,
      [owner.address],
      false,
      [{ recipient: alice.address, amount: 10000000 }],
      testToken.address,
      ethers.constants.HashZero
    );

    mockReceiver = await new MockReceiver__factory(owner).deploy();
    
  });

  beforeEach(async () => {
    snapId = await snapshot.take();
  });

  afterEach(async () => {
    await snapshot.restore(snapId);
  });

  it("Should set base attrs correctly", async () => {
    expect(await invoice.owner()).to.be.equal(owner.address);
    expect(await invoice.distributors(owner.address)).to.be.true;

    expect(await invoice.isImmutableRecipients()).to.be.false;
    await expect(
        invoice.connect(alice).lockRecipients()
    ).to.be.revertedWith("Ownable: caller is not the owner");
    await invoice.lockRecipients();
    expect(await invoice.isImmutableRecipients()).to.be.true;
    await expect(
        invoice.lockRecipients()
    ).to.be.revertedWithCustomError(invoice, "ImmutableRecipientsError");
  });

  it("Should set recipients correctly", async () => {
    await expect(
        invoice.connect(addr3).setRecipients([
        { recipient: alice.address, amount: 2000000 },
        { recipient: addr3.address, amount: 5000000 },
        { recipient: addr4.address, amount: 3000000 },
      ])
    ).to.be.revertedWithCustomError(invoice, "OnlyControllerError");

    await invoice.setRecipients([
      { recipient: alice.address, amount: 2000000 },
      { recipient: addr3.address, amount: 5000000 },
      { recipient: addr4.address, amount: 3000000 },
    ]);

    expect(await invoice.recipients(0)).to.be.equal(alice.address);
    expect(await invoice.recipients(1)).to.be.equal(addr3.address);
    expect(await invoice.recipients(2)).to.be.equal(addr4.address);
    expect(await invoice.receiveAmount(alice.address)).to.be.equal(
      2000000
    );
    expect(await invoice.receiveAmount(addr3.address)).to.be.equal(
      5000000
    );
    expect(await invoice.receiveAmount(addr4.address)).to.be.equal(
      3000000
    );
    expect(await invoice.numberOfRecipients()).to.be.equal(3);

    await invoice.setController(ethers.constants.AddressZero);

    await expect(
      invoice.setRecipients([
        { recipient: alice.address, amount: 2000000 },
        { recipient: addr3.address, amount: 5000000 },
        { recipient: addr4.address, amount: 3000000 },
      ])
    ).to.be.revertedWithCustomError(invoice, "OnlyControllerError");
  });

  it("Should set controller correctly", async () => {
    await expect(
      invoice.connect(alice).setController(alice.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      invoice.setController(owner.address)
    ).to.be.revertedWithCustomError(invoice, "ControllerAlreadyConfiguredError");

    await invoice.setController(ethers.constants.AddressZero);

    await expect(
      invoice.setController(ethers.constants.AddressZero)
    ).to.be.revertedWithCustomError(invoice, "ImmutableControllerError");
  });

  // it("InconsistentDataLengthError()", async () => {
  //   await expect(
  //     rscValve.setRecipients(
  //       [alice.address, addr3.address],
  //       [2000000, 5000000, 3000000]
  //     )
  //   ).to.be.revertedWithCustomError(rscValve, "InconsistentDataLengthError");

  //   await expect(
  //     rscValve.setRecipients(
  //       [alice.address, addr3.address, addr4.address],
  //       [2000000, 5000000]
  //     )
  //   ).to.be.revertedWithCustomError(rscValve, "InconsistentDataLengthError");
  // });

  it("NullAddressRecipientError()", async () => {
    await expect(
        invoice.setRecipients([
        { recipient: alice.address, amount: 5000000 },
        { recipient: ethers.constants.AddressZero, amount: 5000000 },
      ])
    ).to.be.revertedWithCustomError(invoice, "NullAddressRecipientError");
  });

  it("RecipientAlreadyAddedError()", async () => {
    await expect(
        invoice.setRecipients([
        { recipient: alice.address, amount: 5000000 },
        { recipient: alice.address, amount: 5000000 },
      ])
    ).to.be.revertedWithCustomError(invoice, "RecipientAlreadyAddedError");
  });
  
  it("TransferFailedError()", async () => {
    // With mock contract as recipient
    let invoiceNative = await deployInvoice(
      owner.address,
      [owner.address],
      false,
      [
        { recipient: alice.address , amount: ethers.utils.parseEther("25") },
        { recipient: mockReceiver.address , amount: ethers.utils.parseEther("25") }
      ],
      ethers.constants.AddressZero,
      ethers.constants.HashZero
    )

    await owner.sendTransaction({
      to: invoiceNative.address,
      value: ethers.utils.parseEther("50"),
    });
    await expect(
      invoiceNative.redistributeNativeToken()
    ).to.be.revertedWithCustomError(invoiceNative, "TransferFailedError");

    // With mock contract as platform wallet
    await invoiceFactory.setPlatformFee(2000000);
    await invoiceFactory.setPlatformWallet(mockReceiver.address);
    expect(await invoiceFactory.platformWallet()).to.be.equal(
      mockReceiver.address
    );
    const tx = await invoiceFactory.createInvoice({
      controller: owner.address,
      distributors: [owner.address],
      isImmutableRecipients: true,
      recipientsData: [
        { recipient: alice.address, amount: ethers.utils.parseEther("25") },
        { recipient: bob.address, amount: ethers.utils.parseEther("25") },
      ],
      token: ethers.constants.AddressZero,
      creationId: ethers.constants.HashZero,
    });
    const receipt = await tx.wait();
    const invoiceContractAddress = receipt.events?.[3].args?.[0];
    const InvoiceContract = await ethers.getContractFactory("Invoice");
    const invoiceFee = await InvoiceContract.attach(
      invoiceContractAddress
    );
    expect(await invoiceFee.platformFee()).to.be.equal(2000000);
    await owner.sendTransaction({
      to: invoiceFee.address,
      value: ethers.utils.parseEther("50"),
    });
    await expect(
      invoiceFee.redistributeNativeToken()
    ).to.be.revertedWithoutReason;

    await owner.sendTransaction({
      to: invoiceFee.address,
      value: ethers.utils.parseEther("10"),
    })

    await expect(
      invoiceFee.redistributeNativeToken()
    ).to.be.revertedWithCustomError(invoiceFee, "TransferFailedError");
  });

  it("Should set recipients correctly and set immutable recipients", async () => {
    await expect(
      invoice.connect(addr3).setRecipients([
        { recipient: alice.address, amount: 2000000 },
        { recipient: addr3.address, amount: 5000000 },
        { recipient: addr4.address, amount: 3000000 },
      ])
    ).to.be.revertedWithCustomError(invoice, "OnlyControllerError");

    await expect(
        invoice.connect(addr3).lockRecipients()
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await invoice.lockRecipients();

    await expect(
      invoice.setRecipients([
        { recipient: alice.address, amount: 2000000 },
        { recipient: addr3.address, amount: 5000000 },
        { recipient: addr4.address, amount: 3000000 },
      ])
    ).to.be.revertedWithCustomError(invoice, "ImmutableRecipientsError");
  });

  it("Should revert when 0 recipients", async () => {
    let invoiceNative = await deployInvoice(
      owner.address,
      [owner.address],
      true,
      [],
      ethers.constants.AddressZero,
      ethers.constants.HashZero
    );

    await expect(
      invoiceNative.redistributeNativeToken()
    ).to.be.revertedWithoutReason;

    let invoiceERC = await deployInvoice(
      owner.address,
      [owner.address],
      true,
      [],
      testToken.address,
      ethers.constants.HashZero
    );

    await expect(
      invoiceERC.redistributeToken()
    ).to.be.revertedWithoutReason;
  });

  it("Should redistribute ETH correctly", async () => {
    let invoiceNative = await deployInvoice(
      owner.address,
      [owner.address],
      false,
      [
        { recipient: alice.address, amount: ethers.utils.parseEther("40")},
        { recipient: bob.address, amount: ethers.utils.parseEther("10")}
      ],
      ethers.constants.AddressZero,
      ethers.constants.HashZero
    )

    expect(await invoiceNative.numberOfRecipients()).to.be.equal(2);

    const aliceBalanceBefore = (
      await ethers.provider.getBalance(alice.address)
    ).toBigInt();
    const bobBalanceBefore = (
      await ethers.provider.getBalance(bob.address)
    ).toBigInt();

    await owner.sendTransaction({
      to: invoiceNative.address,
      value: ethers.utils.parseEther("50"),
    });

    await invoiceNative.redistributeNativeToken();
    
    const aliceBalanceAfter = (
      await ethers.provider.getBalance(alice.address)
    ).toBigInt();
    const bobBalanceAfter = (
      await ethers.provider.getBalance(bob.address)
    ).toBigInt();

    expect(aliceBalanceAfter).to.be.equal(
      aliceBalanceBefore + ethers.utils.parseEther("40").toBigInt()
    );
    expect(bobBalanceAfter).to.be.equal(
      bobBalanceBefore + ethers.utils.parseEther("10").toBigInt()
    );
  });

  it("Should redistribute ERC20 token", async () => {
    await testToken.mint(invoice.address, ethers.utils.parseEther("100"));

    await invoice.setRecipients([
      { recipient: alice.address, amount: ethers.utils.parseEther("20") },
      { recipient: bob.address, amount: ethers.utils.parseEther("80") },
    ]);

    await invoice.redistributeToken();
    expect(await testToken.balanceOf(invoice.address)).to.be.equal(0);
    expect(await testToken.balanceOf(alice.address)).to.be.equal(
      ethers.utils.parseEther("20")
    );
    expect(await testToken.balanceOf(bob.address)).to.be.equal(
      ethers.utils.parseEther("80")
    );

    await testToken.mint(invoice.address, ethers.utils.parseEther("100"));

    await expect(
      invoice.connect(addr3).redistributeToken()
    ).to.be.revertedWithCustomError(invoice, "OnlyDistributorError");

    await expect(
        invoice.connect(addr3).setDistributor(addr3.address, true)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await invoice.setDistributor(addr3.address, true);
    await expect(
        invoice.redistributeToken()
    ).to.be.revertedWithoutReason;
  });

  it("Should revert without reason", async () => {
    await expect(
      invoice.redistributeNativeToken()
    ).to.be.revertedWithoutReason;
  });

  it("Should initialize only once", async () => {
    await expect(
      invoice.initialize({
        owner: bob.address,
        controller: ethers.constants.AddressZero,
        distributors: [owner.address],
        isImmutableRecipients: false,
        recipientsData: [{ recipient: alice.address, amount: 10000000 }],
        token: ethers.constants.AddressZero,
        platformFee: BigInt(0)
      })
    ).to.be.revertedWith("Initializable: contract is already initialized");
  });

  it("Should transfer ownership correctly", async () => {
    await invoice.transferOwnership(alice.address);
    expect(await invoice.owner()).to.be.equal(alice.address);
    await expect(
      invoice.connect(bob).transferOwnership(bob.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Should work with fees Correctly (native token)", async () => {
    await invoiceFactory.setPlatformWallet(addr5.address);
    await invoiceFactory.setPlatformFee(BigInt(5000000));

    expect(await invoiceFactory.platformWallet()).to.be.equal(addr5.address);
    expect(await invoiceFactory.platformFee()).to.be.equal(BigInt(5000000));

    const txFee = await invoiceFactory.createInvoice({
      controller: owner.address,
      distributors: [owner.address],
      isImmutableRecipients: true,
      recipientsData: [{ recipient: alice.address, amount: ethers.utils.parseEther("10") }],
      token: ethers.constants.AddressZero,
      creationId: ethers.constants.HashZero,
    });
    const receipt = await txFee.wait();
    const invoiceContractAddress = receipt.events?.[3].args?.[0];
    const InvoiceContract = await ethers.getContractFactory("Invoice");
    const invoiceFee = await InvoiceContract.attach(
      invoiceContractAddress
    );

    await owner.sendTransaction({
      to: invoiceFee.address,
      value: ethers.utils.parseEther("10"),
    });

    await expect(
      invoiceFee.redistributeNativeToken()
    ).to.be.revertedWithCustomError(invoiceFee, "LowBalanceError");

    const platformWalletBalanceBefore = (
      await ethers.provider.getBalance(addr5.address)
    ).toBigInt();
    const aliceBalanceBefore = (
      await ethers.provider.getBalance(alice.address)
    ).toBigInt();

    await owner.sendTransaction({
      to: invoiceFee.address,
      value: ethers.utils.parseEther("5"),
    });

    await invoiceFee.redistributeNativeToken();

    const platformWalletBalanceAfter = (
      await ethers.provider.getBalance(addr5.address)
    ).toBigInt();
    const aliceBalanceAfter = (
      await ethers.provider.getBalance(alice.address)
    ).toBigInt();

    expect(platformWalletBalanceAfter).to.be.equal(
      platformWalletBalanceBefore + ethers.utils.parseEther("5").toBigInt()
    );
    expect(aliceBalanceAfter).to.be.equal(
      aliceBalanceBefore + ethers.utils.parseEther("10").toBigInt()
    );
  });

  it("Should work with fees Correctly (ERC20 token)", async () => {
    await invoiceFactory.setPlatformWallet(addr5.address);
    await invoiceFactory.setPlatformFee(BigInt(5000000));

    expect(await invoiceFactory.platformWallet()).to.be.equal(addr5.address);
    expect(await invoiceFactory.platformFee()).to.be.equal(BigInt(5000000));

    const txFee = await invoiceFactory.createInvoice({
      controller: owner.address,
      distributors: [owner.address],
      isImmutableRecipients: true,
      recipientsData: [{ recipient: alice.address, amount: ethers.utils.parseEther("10") }],
      token: testToken.address,
      creationId: ethers.constants.HashZero,
    });
    const receipt = await txFee.wait();
    const invoiceContractAddress = receipt.events?.[3].args?.[0];
    const InvoiceContract = await ethers.getContractFactory("Invoice");
    const invoiceFee = await InvoiceContract.attach(
      invoiceContractAddress
    );

    await testToken.mint(invoiceFee.address, ethers.utils.parseEther("10"));

    await expect(
      invoiceFee.redistributeToken()
    ).to.be.revertedWithCustomError(invoiceFee, "LowBalanceError");

    await testToken.mint(invoiceFee.address, ethers.utils.parseEther("5"));
    await invoiceFee.redistributeToken();

    expect(await testToken.balanceOf(addr5.address)).to.be.equal(
      ethers.utils.parseEther("5")
    );
    expect(await testToken.balanceOf(alice.address)).to.be.equal(
      ethers.utils.parseEther("10")
    );
  });

  it("Should work with creation ID correctly", async () => {
    const InvoiceCreationIdFactory = await ethers.getContractFactory(
      "InvoiceFactory"
    );
    const invoiceCreationIdFactory = await InvoiceCreationIdFactory.deploy();
    await invoiceCreationIdFactory.deployed();

    await invoiceCreationIdFactory.createInvoice({
      controller: owner.address,
      distributors: [owner.address],
      isImmutableRecipients: true,
      recipientsData: [{ recipient: alice.address, amount: BigInt(10000000) }],
      token: ethers.constants.AddressZero,
      creationId: ethers.utils.formatBytes32String("test-creation-id-1"),
    });

    await expect(
      invoiceCreationIdFactory.createInvoice({
        controller: owner.address,
        distributors: [owner.address],
        isImmutableRecipients: true,
        recipientsData: [{ recipient: alice.address, amount: BigInt(10000000) }],
        token: ethers.constants.AddressZero,
        creationId: ethers.utils.formatBytes32String("test-creation-id-1"),
      })
    ).to.be.revertedWith("ERC1167: create2 failed");

    await invoiceCreationIdFactory.createInvoice({
      controller: owner.address,
      distributors: [owner.address],
      isImmutableRecipients: true,
      recipientsData: [
        { recipient: alice.address, amount: BigInt(5000000) },
        { recipient: bob.address, amount: BigInt(5000000) },
      ],
      token: ethers.constants.AddressZero,
      creationId: ethers.utils.formatBytes32String("test-creation-id-1"),
    });

    await invoiceCreationIdFactory.createInvoice({
      controller: owner.address,
      distributors: [owner.address],
      isImmutableRecipients: true,
      recipientsData: [{ recipient: alice.address, amount: BigInt(10000000) }],
      token: ethers.constants.AddressZero,
      creationId: ethers.utils.formatBytes32String("test-creation-id-2"),
    });
  });

  it("Should distribute small amounts correctly", async () => {
    await invoice.setRecipients([
      { recipient: alice.address, amount: BigInt(2000000) },
      { recipient: bob.address, amount: BigInt(8000000) },
    ]);
    
    await testToken.mint(invoice.address, BigInt(15000000));

    await invoice.redistributeToken();
    expect(await testToken.balanceOf(alice.address)).to.be.equal(
      BigInt(2000000)
    );
    expect(await testToken.balanceOf(bob.address)).to.be.equal(
      BigInt(8000000)
    );
    expect(await testToken.balanceOf(invoice.address)).to.be.equal(BigInt(5000000));

    await expect(
      invoice.redistributeToken()
    ).to.be.revertedWithoutReason;
  });

  it("Should distribute small ether amounts correctly", async () => {
    let invoiceNative = await deployInvoice(
      owner.address,
      [owner.address],
      true,
      [
        { recipient: alice.address, amount: BigInt(2000000) },
        { recipient: bob.address, amount: BigInt(8000000) },
      ],
      ethers.constants.AddressZero,
      ethers.constants.HashZero
    )

    const aliceBalanceBefore1 = (
      await ethers.provider.getBalance(alice.address)
    ).toBigInt();
    const bobBalanceBefore1 = (
      await ethers.provider.getBalance(bob.address)
    ).toBigInt();

    await owner.sendTransaction({
      to: invoiceNative.address,
      value: ethers.utils.parseEther("0.000000000015"),
    });

    await invoiceNative.redistributeNativeToken();

    expect(
      (await ethers.provider.getBalance(alice.address)).toBigInt()
    ).to.be.equal(
      aliceBalanceBefore1 +
        ethers.utils.parseEther("0.000000000002").toBigInt()
    );
    expect(
      (await ethers.provider.getBalance(bob.address)).toBigInt()
    ).to.be.equal(
      bobBalanceBefore1 + ethers.utils.parseEther("0.000000000008").toBigInt()
    );
    expect(
      (await ethers.provider.getBalance(invoiceNative.address)).toBigInt()
    ).to.be.equal(ethers.utils.parseEther("0.000000000005").toBigInt());

    expect(
      invoiceNative.redistributeNativeToken()
    ).to.be.revertedWithoutReason;
  });
});
