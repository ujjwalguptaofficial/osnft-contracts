import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { IDeployedPayload } from "../interfaces";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";


export function testMint(payload: IDeployedPayload) {

    const signMessage = async (user: SignerWithAddress, tokenId: string, star: number, fork: number, deadline: number) => {
        // const domainType = [
        //     { name: "name", type: "string" },
        //     { name: "version", type: "string" },
        //     { name: "chainId", type: "uint256" },
        //     { name: "verifyingContract", type: "address" },
        // ];
        const dataType = [
            { name: "tokenId", type: "uint256" },
            { name: "star", type: "uint256" },
            { name: "fork", type: "uint256" },
            { name: "validUntil", type: "uint256" },
        ];

        const domainData = {
            name: "OSNFT",
            version: "1",
            chainId: await user.getChainId(),
            verifyingContract: payload.nft.address.toLowerCase(),
        };
        const message = {
            tokenId,
            star,
            fork,
            validUntil: deadline
        };



        const signatureResult = await user._signTypedData(domainData, {
            NFTMintData: dataType,
        }, message);
        // recover


        return signatureResult;
    }

    it('expired signature', async () => {
        const nft = payload.nft;
        const timestamp = await time.latest() - 1000;

        const projectUrl = payload.projects.jsstore;
        const tokenId = payload.getProjectId(projectUrl);
        const star = 10;
        const fork = 10;
        const signature = signMessage(payload.deployer, tokenId.toString(), star, fork, timestamp);

        const tx = nft.mintTo(tokenId, star, fork, {
            signature, to: payload.operator.address, validUntil: timestamp
        });

        await expect(tx).revertedWithCustomError(nft, 'SignatureExpired');
    })

    it('by address not minters', async () => {
        const nft = payload.nft;
        const timestamp = await time.latest() + 1000;

        const projectUrl = payload.projects.jsstore;
        const tokenId = payload.getProjectId(projectUrl);
        const star = 10;
        const fork = 10;
        const signature = signMessage(payload.deployer, tokenId.toString(), star, fork, timestamp);

        const tx = nft.connect(payload.signer4).mintTo(tokenId, star, fork, {
            signature, to: payload.operator.address, validUntil: timestamp
        });

        await expect(tx).revertedWithCustomError(nft, 'RequireMinter');
    })

    it('minting to creator', async () => {
        const nft = payload.nft;
        const timestamp = await time.latest() + 1000;

        const projectUrl = payload.projects.jsstore;
        const tokenId = payload.getProjectId(projectUrl);
        const star = 10;
        const fork = 10;
        const signature = signMessage(payload.deployer, tokenId.toString(), star, fork, timestamp);

        const tx = nft.connect(payload.operator).mintTo(tokenId, star, fork, {
            signature, to: payload.operator.address, validUntil: timestamp
        });

        await expect(tx).revertedWithCustomError(nft, 'AlreadyMinted');
    })

    it('mint price', async () => {
        const nft = payload.nft;
        const timestamp = await time.latest() + 1000;



        const projectUrl = payload.projects.jsstore;
        const tokenId = payload.getProjectId(projectUrl);
        const star = 10;
        const fork = 10;

        const projectInfo = await nft.getProject(tokenId);

        // mint price

        const expectedMintPrice = payload.mintPrice(star, fork, projectInfo);
        const mintPrice = await nft.mintPrice(tokenId, star, fork);

        expect(mintPrice).to.greaterThan(0);
        expect(mintPrice).to.equal(expectedMintPrice);

        console.log("expectedMintPrice", expectedMintPrice.toString());
    })

    it('mint jsstore success to signer2', async () => {
        const nft = payload.nft;
        const timestamp = await time.latest() + 1000;

        const projectUrl = payload.projects.jsstore;
        const tokenId = payload.getProjectId(projectUrl);
        const star = 10;
        const fork = 5;
        const to = payload.signer2.address;
        const signature = signMessage(payload.signer2, tokenId.toString(), star, fork, timestamp);

        // allow payment token
        await payload.erc20Token1.connect(payload.signer2).approve(nft.address, ethers.constants.MaxUint256);

        const allowance = await payload.erc20Token1.allowance(to, nft.address);

        const tx = nft.connect(payload.operator).mintTo(tokenId, star, fork, {
            signature, to, validUntil: timestamp
        });

        // check for transfer events

        await expect(tx).to.emit(nft, 'TransferSingle').withArgs(
            payload.operator.address, ethers.constants.AddressZero, to, tokenId, 1
        );

        const projectInfoAfter = await nft.getProject(tokenId);

        expect(projectInfoAfter.tokenCount).equal(2);
        const expectedMintPrice = payload.mintPrice(star, fork, projectInfoAfter);

        const expectedMintPriceBN = ethers.BigNumber.from(expectedMintPrice);

        const contractRoyality = payload.getPercentage(
            expectedMintPriceBN, 1
        );

        const creatorRoyality = await projectInfoAfter.royality;

        const creatorRoyalityValue = payload.getPercentage(
            ethers.BigNumber.from(expectedMintPrice), creatorRoyality
        );

        const amountForTreasury = expectedMintPriceBN.sub(contractRoyality).sub(creatorRoyalityValue);

        expect(projectInfoAfter.treasuryTotalAmount).equal(amountForTreasury);
        expect(projectInfoAfter.lastMintPrice).equal(expectedMintPrice);

        // balance of creator

        const balanceOfCreator = await nft.balanceOf(to, tokenId);
        expect(balanceOfCreator).equal(1);

        // check tokenmint 

        expect(tx).to.emit(nft, "TokenMint").withArgs(star, fork, expectedMintPrice);
    })

    it('minting to a owner', async () => {
        const nft = payload.nft;
        const timestamp = await time.latest() + 1000;

        const projectUrl = payload.projects.jsstore;
        const tokenId = payload.getProjectId(projectUrl);
        const star = 10;
        const fork = 5;
        const to = payload.signer2.address;
        const signature = signMessage(payload.signer2, tokenId.toString(), star, fork, timestamp);

        const tx = nft.connect(payload.operator).mintTo(tokenId, star, fork, {
            signature, to, validUntil: timestamp
        });

        await expect(tx).revertedWithCustomError(nft, 'AlreadyMinted');
    })

    it('mint jsstore success to signer3', async () => {
        const nft = payload.nft;
        const timestamp = await time.latest() + 1000;

        const projectUrl = payload.projects.jsstore;
        const tokenId = payload.getProjectId(projectUrl);
        const star = 20;
        const fork = 10;
        const to = payload.signer3.address;
        const signature = signMessage(payload.signer3, tokenId.toString(), star, fork, timestamp);

        // allow payment token
        await payload.erc20Token1.connect(payload.signer3).approve(nft.address, ethers.constants.MaxUint256);

        const allowance = await payload.erc20Token1.allowance(to, nft.address);

        const projectInfoBefore = await nft.getProject(tokenId);


        const tx = nft.connect(payload.operator).mintTo(tokenId, star, fork, {
            signature, to, validUntil: timestamp
        });

        // check for transfer events

        await expect(tx).to.emit(nft, 'TransferSingle').withArgs(
            payload.operator.address, ethers.constants.AddressZero, to, tokenId, 1
        );

        const projectInfoAfter = await nft.getProject(tokenId);

        expect(projectInfoAfter.tokenCount).equal(3);
        const expectedMintPrice = payload.mintPrice(star, fork, projectInfoAfter);

        const expectedMintPriceBN = ethers.BigNumber.from(expectedMintPrice);

        const contractRoyality = payload.getPercentage(
            expectedMintPriceBN, 1
        );

        const creatorRoyality = await projectInfoAfter.royality;

        const creatorRoyalityValue = payload.getPercentage(
            ethers.BigNumber.from(expectedMintPrice), creatorRoyality
        );

        const amountForTreasury = expectedMintPriceBN.sub(contractRoyality).sub(creatorRoyalityValue);

        expect(projectInfoAfter.treasuryTotalAmount).equal(amountForTreasury.add(projectInfoBefore.treasuryTotalAmount));
        expect(projectInfoAfter.lastMintPrice).equal(expectedMintPrice);

        // balance of creator

        const balanceOfCreator = await nft.balanceOf(to, tokenId);
        expect(balanceOfCreator).equal(1);

        // check tokenmint 

        expect(tx).to.emit(nft, "TokenMint").withArgs(star, fork, expectedMintPrice);
    })

    it('mint jsstore success to signer4 with less PF', async () => {
        const nft = payload.nft;
        const timestamp = await time.latest() + 1000;

        const projectUrl = payload.projects.jsstore;
        const tokenId = payload.getProjectId(projectUrl);
        const star = 18;
        const fork = 10;
        const to = payload.signer4.address;
        const signature = signMessage(payload.signer4, tokenId.toString(), star, fork, timestamp);

        // allow payment token
        await payload.erc20Token1.connect(payload.signer4).approve(nft.address, ethers.constants.MaxUint256);

        const allowance = await payload.erc20Token1.allowance(to, nft.address);

        const projectInfoBefore = await nft.getProject(tokenId);


        const tx = nft.connect(payload.operator).mintTo(tokenId, star, fork, {
            signature, to, validUntil: timestamp
        });

        // check for transfer events

        await expect(tx).to.emit(nft, 'TransferSingle').withArgs(
            payload.operator.address, ethers.constants.AddressZero, to, tokenId, 1
        );

        const projectInfoAfter = await nft.getProject(tokenId);

        expect(projectInfoAfter.tokenCount).equal(4);
        let expectedMintPrice = payload.mintPrice(star, fork, projectInfoAfter);
        expectedMintPrice = expectedMintPrice > projectInfoBefore.lastMintPrice ? expectedMintPrice : projectInfoBefore.lastMintPrice;

        const expectedMintPriceBN = ethers.BigNumber.from(expectedMintPrice);

        const contractRoyality = payload.getPercentage(
            expectedMintPriceBN, 1
        );

        const creatorRoyality = await projectInfoAfter.royality;

        const creatorRoyalityValue = payload.getPercentage(
            ethers.BigNumber.from(expectedMintPrice), creatorRoyality
        );

        const amountForTreasury = expectedMintPriceBN.sub(contractRoyality).sub(creatorRoyalityValue);

        expect(projectInfoAfter.treasuryTotalAmount).equal(amountForTreasury.add(projectInfoBefore.treasuryTotalAmount));
        expect(projectInfoAfter.lastMintPrice).equal(expectedMintPrice);

        // balance of creator

        const balanceOfCreator = await nft.balanceOf(to, tokenId);
        expect(balanceOfCreator).equal(1);

        // check tokenmint 

        expect(tx).to.emit(nft, "TokenMint").withArgs(star, fork, expectedMintPrice);
    })
}