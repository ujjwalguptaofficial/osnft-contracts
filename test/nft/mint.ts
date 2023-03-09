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

    it('success jsstore', async () => {
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

    it('success jsstore', async () => {
        const nft = payload.nft;
        const timestamp = await time.latest() + 1000;

        const projectUrl = payload.projects.jsstore;
        const tokenId = payload.getProjectId(projectUrl);
        const star = 10;
        const fork = 10;
        const to = payload.signer2.address;
        const signature = signMessage(payload.signer2, tokenId.toString(), star, fork, timestamp);

        // allow payment token
        await payload.erc20Token1.connect(payload.signer2).approve(nft.address, ethers.constants.MaxUint256);

        const allowance = await payload.erc20Token1.allowance(to, nft.address);

        console.log("allowance", allowance);

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

        expect(projectInfoAfter.treasuryTotalAmount).equal(184);
        expect(projectInfoAfter.lastMintPrice).equal(expectedMintPrice);

        // balance of creator

        const balanceOfCreator = await nft.balanceOf(to, tokenId);
        expect(balanceOfCreator).equal(1);
    })

    return;

    it('minting again same project', async () => {
        const nft = payload.nft;
        const timestamp = await time.latest() + 1000;
        const basePrice = 100;
        const popularityFactorPrice = 1;
        const paymentToken = payload.erc20Token1.address;
        const royality = 5;
        const projectUrl = payload.projects.jsstore;
        const tokenId = payload.getProjectId(projectUrl);

        const signature = signMessage(payload.deployer, projectUrl, basePrice,
            popularityFactorPrice, paymentToken, royality, timestamp
        );

        const tx = nft.tokenizeProject({
            basePrice: basePrice,
            paymentERC20Token: paymentToken,
            popularityFactorPrice: popularityFactorPrice,
            projectUrl,
            royality: royality
        }, {
            signature, to: payload.deployer.address, validUntil: timestamp
        });

        await expect(tx).revertedWithCustomError(nft, 'ProjectExist');
    })

}