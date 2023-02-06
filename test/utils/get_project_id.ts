import { ethers, } from "ethers";

export function getProjectId(projectUrl: string) {
    const projectId = ethers.BigNumber.from(
        ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes(projectUrl)
        )
    );
    // console.log('projectId', projectId, 'projectUrl', projectUrl);
    // ethers.BigNumber.from()
    return projectId;
}