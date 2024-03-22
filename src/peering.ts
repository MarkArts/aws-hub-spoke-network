import * as aws from "@pulumi/aws";

export type peerTwoRegionsArgs = {
  regionA: {
    provider: aws.Provider;
    transitGateway: aws.ec2transitgateway.TransitGateway;
    region: {
      region: string;
      routes: string[];
    };
  };
  regionB: {
    provider: aws.Provider;
    transitGateway: aws.ec2transitgateway.TransitGateway;
    region: {
      region: string;
      routes: string[];
    };
  };
};

// peerTwoRegions accociates 2 transit gateway together
// and updated the routable of both regions with the
// cidr blocks accociated with the others region
export const peerTwoRegions = (prefix: string, args: peerTwoRegionsArgs) => {
  const peerRegion = aws.getRegion({}, { provider: args.regionB.provider });

  const attachment = new aws.ec2transitgateway.PeeringAttachment(
    `${prefix}-${args.regionA.region.region}-${args.regionB.region.region}-peer-attach`,
    {
      transitGatewayId: args.regionA.transitGateway.id,
      peerTransitGatewayId: args.regionB.transitGateway.id,
      peerRegion: peerRegion.then((r) => r.name),
      tags: {
        Name: `${prefix}-${args.regionA.region.region}-${args.regionB.region.region}-peer-attach`,
      },
    },
    {
      provider: args.regionA.provider,
      deleteBeforeReplace: true,
    },
  );

  const attachmentAccept = new aws.ec2transitgateway.PeeringAttachmentAccepter(
    `${prefix}-${args.regionA.region.region}-${args.regionB.region.region}-peer-accept`,
    {
      transitGatewayAttachmentId: attachment.id,
      tags: {
        Name: `${prefix}-${args.regionA.region.region}-${args.regionB.region.region}-peer-accept`,
      },
    },
    {
      provider: args.regionB.provider,
    },
  );

  // map the ips from regionB on the routeable of regionA
  const routesA = args.regionB.region.routes.map((c) => {
    return new aws.ec2transitgateway.Route(
      `${prefix}-${args.regionA.region.region}-${
        args.regionB.region.region
      }-${c.replace("/", "-")}`,
      {
        transitGatewayRouteTableId:
          args.regionA.transitGateway.associationDefaultRouteTableId,
        transitGatewayAttachmentId: attachment.id,
        destinationCidrBlock: c,
      },
      {
        provider: args.regionA.provider,
        dependsOn: attachmentAccept,
        deleteBeforeReplace: true,
      },
    );
  });

  // map the ips from regionA on the routeable of regionB
  const routesB = args.regionA.region.routes.map((c) => {
    return new aws.ec2transitgateway.Route(
      `${prefix}-${args.regionB.region.region}-${
        args.regionA.region.region
      }-route-${c.replace("/", "-")}`,
      {
        transitGatewayRouteTableId:
          args.regionB.transitGateway.associationDefaultRouteTableId,
        transitGatewayAttachmentId: attachment.id,
        destinationCidrBlock: c,
      },
      {
        provider: args.regionB.provider,
        dependsOn: attachmentAccept,
        deleteBeforeReplace: true,
      },
    );
  });

  return {
    attachment,
    attachmentAccept,
    routesA,
    routesB,
  };
};
