import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

interface SsmJsonWriterProps {
  parameterName: string;
  values: Record<string, string>;
}

/**
 * Merges key-value pairs into an existing SSM StringParameter that holds JSON.
 * Reads the current value, merges the new keys, and writes it back.
 */
export class SsmJsonWriter extends Construct {
  constructor(scope: Construct, id: string, props: SsmJsonWriterProps) {
    super(scope, id);

    const fn = new lambda.Function(this, 'Handler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(30),
      code: lambda.Code.fromInline(`
const { SSMClient, GetParameterCommand, PutParameterCommand } = require('@aws-sdk/client-ssm');
const client = new SSMClient();

exports.handler = async (event) => {
  const physicalId = event.PhysicalResourceId || event.ResourceProperties.ParameterName;
  if (event.RequestType === 'Delete') return { PhysicalResourceId: physicalId };

  const paramName = event.ResourceProperties.ParameterName;
  const keys = event.ResourceProperties.Keys.split(',');

  const { Parameter } = await client.send(new GetParameterCommand({ Name: paramName }));
  const current = JSON.parse(Parameter.Value);

  for (const key of keys) {
    current[key] = event.ResourceProperties['Val_' + key];
  }

  await client.send(new PutParameterCommand({
    Name: paramName,
    Value: JSON.stringify(current),
    Type: 'String',
    Overwrite: true,
  }));

  return { PhysicalResourceId: physicalId };
};
      `),
    });

    fn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ssm:GetParameter', 'ssm:PutParameter'],
      resources: [cdk.Stack.of(this).formatArn({
        service: 'ssm',
        resource: 'parameter',
        resourceName: props.parameterName.replace(/^\//, ''),
      })],
    }));

    const keys = Object.keys(props.values);
    const properties: Record<string, string> = {
      ParameterName: props.parameterName,
      Keys: keys.join(','),
    };
    for (const key of keys) {
      properties[`Val_${key}`] = props.values[key];
    }

    new cdk.CustomResource(this, 'Resource', {
      serviceToken: new cr.Provider(this, 'Provider', {
        onEventHandler: fn,
      }).serviceToken,
      properties,
    });
  }
}
