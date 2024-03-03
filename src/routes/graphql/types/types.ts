import { MemberTypeId } from "../../member-types/schemas.js";

 export interface ICreateUserInput {
    name: string;
    balance: number;
  }

 export interface ICreatePostInput {
    title: string;
    content: string;
    authorId: string;
  }

 export interface ICreateProfileInput {
    isMale: boolean;
    yearOfBirth: number;
    userId: string;
    memberTypeId: MemberTypeId;
  }
