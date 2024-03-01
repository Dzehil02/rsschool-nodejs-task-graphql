import { FastifyRequest, RouteGenericInterface, RawServerDefault } from "fastify";
import { IncomingMessage } from "http";
import { MemberTypeId } from "../../member-types/schemas.js";

 export interface CreateUserInput {
    name: string;
    balance: number;
  }

 export interface CreatePostInput {
    title: string;
    content: string;
    authorId: string;
  }

 export interface CreateProfileInput {
    isMale: boolean;
    yearOfBirth: number;
    userId: string;
    memberTypeId: MemberTypeId;
  }
  
export interface ExtendedRequest extends FastifyRequest<RouteGenericInterface, RawServerDefault, IncomingMessage> {
    input: CreateUserInput | CreatePostInput | CreateProfileInput
  }