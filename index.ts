import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { setupRAM } from "./src/ram";
import { peerTwoRegions } from "./src/peering";

const cfg = new pulumi.Config();

type RegionInfo = {
  region: aws.Region;
  routes: string[];
};

// it's important that to list of regions remains in the same order this will make sure pulumi will
// correctly seperate the resources
const sortByRegionName = (a: RegionInfo, b: RegionInfo) => {
  if (a.region < b.region) {
    return -1;
  }
  if (a.region > b.region) {
    return 1;
  }
  return 0;
};
const regionInfos = cfg
  .requireObject<RegionInfo[]>("regions")
  .sort(sortByRegionName);
const allowdAccountIds = cfg.requireObject<string[]>("allowdAccountIds");

// Default tags used for all regions
const DefaultTags: Record<string, string> = {
  Provider: "Pulumi",
  Project: "aws-hub-spoke-network",
  Service: "global-network",
  Stack: cfg.name,
};

// first create a internet gateway in each region and share it with all allowdAccountIds
// this will also creat a provider for each region
const regions = regionInfos.map((region) => {
  const provider = new aws.Provider(
    `ahsn-${region.region}-aws`,
    {
      ...aws.config,
      region: region.region,
      defaultTags: {
        tags: {
          ...DefaultTags,
        },
      },
    },
    {
      ignoreChanges: ["profile"],
    },
  );

  const transitGateway = new aws.ec2transitgateway.TransitGateway(
    `ahsn-${region.region}-gw`,
    {
      autoAcceptSharedAttachments: "enable",
      tags: {
        Name: `ahsn-${region.region}-gw`,
      },
    },
    {
      provider,
    },
  );

  // RAM is Resource Access Management and will allow all given account ids
  // to attach their own VPC's to the created transitgateway
  const ram = setupRAM(
    `ahsn-${region.region}`,
    {
      resource: transitGateway.arn,
      allow: allowdAccountIds,
    },
    {
      provider,
    },
  );

  return {
    region,
    provider,
    transitGateway,
    ram,
  };
});

// this will connect each transit gateways with all other transit gateways
// the routes of regionA will be configured in the routetable of regionB
// and the routes of regionB will be configured in the routes of regionA
// see the readme for a illustration
const peerings = [];
for (let i = 0; i < regions.length; i++) {
  const regionA = regions[i];
  for (const regionB of regions.slice(i + 1)) {
    peerings.push(
      peerTwoRegions(`ahsn`, {
        regionA,
        regionB,
      }),
    );
  }
}

export const globalNetwork = {
  regions: regions.map((r) => {
    return {
      name: r.region.region,
      gateWayArn: r.transitGateway.arn,
    };
  }),
  peerings: peerings.length,
  allowedAcounts: allowdAccountIds,
};
