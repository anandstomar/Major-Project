import { Resolver, Query, Args } from '@nestjs/graphql';
import { AnchorsService } from './anchors.service';
import { Anchor } from './anchor.model'; // We will create this next

@Resolver(() => Anchor)
export class AnchorsResolver {
  constructor(private readonly anchorsService: AnchorsService) {}

  @Query(() => [Anchor], { name: 'anchors' })
  async getAnchors() {
    return this.anchorsService.findAll();
  }

  @Query(() => Anchor, { name: 'anchor', nullable: true })
  async getAnchor(@Args('requestId') requestId: string) {
    return this.anchorsService.findOne(requestId);
  }
}