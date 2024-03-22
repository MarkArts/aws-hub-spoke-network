import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export type SetupRAMArgs = {
  resource: pulumi.Input<string>;
  allow: pulumi.Input<string>[];
};

export const setupRAM = (
  prefix: string,
  args: SetupRAMArgs,
  opts?: pulumi.ComponentResourceOptions,
) => {
  const ram = new aws.ram.ResourceShare(`${prefix}-ram`, {}, opts);

  const ramAttach = new aws.ram.ResourceAssociation(
    `${prefix}-ram-asc`,
    {
      resourceArn: args.resource,
      resourceShareArn: ram.arn,
    },
    opts,
  );

  const ramPrincipels = args.allow.map((id) => {
    return new aws.ram.PrincipalAssociation(
      `ahsn-${prefix}-ram-allow-${id}`,
      {
        resourceShareArn: ram.arn,
        principal: id,
      },
      opts,
    );
  });

  return {
    ram,
    ramAttach,
    ramPrincipels,
  };
};
