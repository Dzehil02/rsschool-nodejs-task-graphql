import { Type } from '@fastify/type-provider-typebox';
import { PrismaClient, User, Profile, Post } from '@prisma/client';
import { buildSchema } from 'graphql';
import {
  CreatePostInput,
  CreateProfileInput,
  CreateUserInput,
  ExtendedRequest,
} from './types/types.js';

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

    scalar UUID

    type MemberType {
        id: MemberTypeId
        discount: Float      
        postsLimitPerMonth: Int
        profiles: [Profile]
    }

    type User {
      id: UUID
      name: String
      balance: Float
      profile: Profile
      posts: [Post]
  }

    type Post {
        id: UUID
        title: String
        content: String
        authorId: String
        author: User
    }

    type Profile {
        id: UUID
        isMale: Boolean
        yearOfBirth: Int
        userId: String
        memberTypeId: MemberTypeId
        memberType: MemberType
        user: User
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
      users: [User]
      posts: [Post]
      profiles: [Profile]
      memberType(id: MemberTypeId!): MemberType
      user(id: UUID!): User
      post(id: UUID!): Post
      profile(id: UUID!): Profile
  }

`);

export const rootValue = {
  memberTypes: async () => {
    const memberTypes = await prisma.memberType.findMany();
    return memberTypes;
  },
  memberType: async (req: ExtendedRequest) => {
    const { id } = req;
    const memberType = await prisma.memberType.findUnique({
      where: {
        id,
      },
      include: {
        profiles: true,
      },
    });
    return memberType;
  },
  users: async () => {
    const users = await prisma.user.findMany({
      include: {
        posts: true,
        profile: {
          include: {
            memberType: true,
          },
        },
      },
    });
    return users;
  },
  user: async (req: ExtendedRequest) => {
    const { id } = req;
    const user = await prisma.user.findUnique({
      where: {
        id,
      },
      include: {
        posts: true,
        profile: {
          include: {
            memberType: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    return user;
  },
  posts: async () => {
    const posts = await prisma.post.findMany();
    return posts;
  },
  post: async (req: ExtendedRequest) => {
    const { id } = req;
    const post = await prisma.post.findUnique({
      where: {
        id,
      },
      include: {
        author: true,
      },
    });
    if (!post) {
      return null;
    }
    return post;
  },
  profiles: async () => {
    const profiles = await prisma.profile.findMany();
    return profiles;
  },
  profile: async (req: ExtendedRequest) => {
    const { id } = req;
    const profile = await prisma.profile.findUnique({
      where: {
        id,
      },
      include: {
        user: true,
        memberType: true,
      },
    });
    if (!profile) {
      return null;
    }
    return profile;
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
