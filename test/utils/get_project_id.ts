import { ethers, } from "ethers";

export function getProjectId(projectUrl: string) {
    return ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(projectUrl)
    );
}