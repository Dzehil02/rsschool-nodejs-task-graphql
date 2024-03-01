import { Type } from '@fastify/type-provider-typebox';
import { PrismaClient, User, Profile, Post } from '@prisma/client';
import { buildSchema } from 'graphql';
import { CreatePostInput, CreateProfileInput, CreateUserInput, ExtendedRequest } from './types/types.js';

export const gqlResponseSchema = Type.Partial(
  Type.Object({
    data: Type.Any(),
    errors: Type.Any(),
  }),
);

export const createGqlResponseSchema = {
  body: Type.Object(
    {
      query: Type.String(),
      variables: Type.Optional(Type.Record(Type.String(), Type.Any())),
    },
    {
      additionalProperties: false,
    },
  ),
};

const prisma = new PrismaClient();

export const schema = buildSchema(`
    enum MemberTypeId {
        basic
        business
    }

    type MemberType {
        id: MemberTypeId
        discount: Float      
        postsLimitPerMonth: Int
    }

    type User {
      id: String
      name: String
      balance: Float
  }

    type Post {
        id: String
        title: String
        content: String
        authorId: String
    }

    type Profile {
        id: String
        isMale: Boolean
        yearOfBirth: Int
        userId: String
        memberTypeId: MemberTypeId
    }

    input UserInput {
        name: String!
        balance: Float!
    }

    input PostInput {
        title: String!
        content: String!
        authorId: String!
    }

    input ProfileInput {
        isMale: Boolean!
        yearOfBirth: Int!
        userId: String!
        memberTypeId: MemberTypeId!
    }

    type Mutation {
      createUser(input: UserInput!): User
      createPost(input: PostInput!): Post
      createProfile(input: ProfileInput!): Profile
  }

    type Query {
      memberTypes: [MemberType]
      getMemberTypeByIdSchema(id: MemberTypeId!): MemberType
      users: [User]
      posts: [Post]
      profiles: [Profile]
  }

`);

export const rootValue = {
  memberTypes: async () => {
    const memberTypes = await prisma.memberType.findMany();
    return memberTypes;
  },
  getMemberTypeByIdSchema: async (req: ExtendedRequest) => {
    const { id } = req;
    const memberType = await prisma.memberType.findUnique({
      where: {
        id,
      },
    });
    return memberType;
  },
  users: async () => {
    const users = await prisma.user.findMany();
    return users;
  },
  posts: async () => {
    const posts = await prisma.post.findMany();
    return posts;
  },
  profiles: async () => {
    const profiles = await prisma.profile.findMany();
    return profiles;
  },
  createUser: async (req: ExtendedRequest) => {
    const { name, balance } = req.input as CreateUserInput;
    const user: User = await prisma.user.create({
      data: {
        name,
        balance,
      },
    });
    return user;
  },

  createPost: async (req: ExtendedRequest) => {
    const { title, content, authorId } = req.input as CreatePostInput;
    const post: Post = await prisma.post.create({
      data: {
        title,
        content,
        authorId,
      },
    });
    return post;
  },

  createProfile: async (req: ExtendedRequest) => {
    const { isMale, yearOfBirth, userId, memberTypeId } = req.input as CreateProfileInput;
    console.log(req.input);
    const profile: Profile = await prisma.profile.create({
      data: {
        isMale,
        yearOfBirth,
        userId,
        memberTypeId,
      },
    });
    return profile;
  },
};
