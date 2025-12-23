import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class Anchor {
  @Field(() => Int)
  id: number | undefined;

  @Field(() => String)
  requestId: string | undefined;

  @Field({ nullable: true })
  merkleRoot?: string;

  @Field({ nullable: true })
  txHash?: string;

  @Field(() => Int, { nullable: true })
  blockNumber?: number;

  @Field({ nullable: true })
  status?: string;

  @Field({ nullable: true })
  submittedAt?: Date;

  @Field({ nullable: true })
  eventsJson?: string;

  @Field({ nullable: true })
  submitter?: string;
}