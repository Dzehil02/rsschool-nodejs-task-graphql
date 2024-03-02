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
      userSubscribedTo: [SubscribersOnAuthors]
      subscribedToUser: [SubscribersOnAuthors]
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

    type SubscribersOnAuthors {
      subscriberId: UUID
      authorId: UUID
      subscriber: User
      author: User
    }

    input CreateUserInput {
        name: String!
        balance: Float!
    }

    input CreatePostInput {
        title: String!
        content: String!
        authorId: String!
    }

    input CreateProfileInput {
        isMale: Boolean!
        yearOfBirth: Int!
        userId: String!
        memberTypeId: MemberTypeId!
    }

    input ChangeUserInput {
        name: String
        balance: Float
        profileId: String
    }

    input ChangePostInput {
        title: String
        content: String
        authorId: String
    }

    input ChangeProfileInput {
        isMale: Boolean
        yearOfBirth: Int
        memberTypeId: MemberTypeId
    }

    type Mutation {
      createUser(dto: CreateUserInput!): User
      createPost(dto: CreatePostInput!): Post
      createProfile(dto: CreateProfileInput!): Profile
      deleteUser(id: UUID!): UUID
      deletePost(id: UUID!): UUID
      deleteProfile(id: UUID!): UUID
      changeUser(id: UUID!, dto: ChangeUserInput!): User
      changePost(id: UUID!, dto: ChangePostInput!): Post
      changeProfile(id: UUID!, dto: ChangeProfileInput!): Profile
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
      subscribedToUser(id: UUID!): [User]
      userSubscribedTo(id: UUID!): [User]
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
        userSubscribedTo: true,
        subscribedToUser: {
          include: {
            author: true,
            subscriber: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }
    console.log('user');
    console.log(user);
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
  subscribedToUser: async (req: ExtendedRequest) => {
    const { id } = req;
    const users = await prisma.user.findMany({
      where: {
        userSubscribedTo: {
          some: {
            authorId: id,
          },
        },
      },
    });

    //
    const subscribersOnAuthors = await prisma.subscribersOnAuthors.findMany({
      where: {
        authorId: id,
      },
      include: {
        subscriber: true,
        author: true,
      },
    });

    console.log('subscribersOnAuthors');
    console.log(subscribersOnAuthors);
    //

    console.log('users from subscribedToUser');
    console.log(users);
    return users;
  },

  userSubscribedTo: async (req: ExtendedRequest) => {
    const { id } = req;
    const users = await prisma.user.findMany({
      where: {
        subscribedToUser: {
          some: {
            subscriberId: id,
          },
        },
      },
    });
    console.log('users from userSubscribedTo');
    console.log(users);
    return users;
  },

  // userSubscribedTo: async (req: ExtendedRequest) => {
  //   const { id } = req;
  //   const subscribersOnAuthors = await prisma.subscribersOnAuthors.findMany({
  //     where: {
  //       authorId: id,
  //     },
  //     include: {
  //       subscriber: true,
  //     },
  //   });
  //   return subscribersOnAuthors;
  // },

  // subscribedToUser: async (req: ExtendedRequest) => {
  //   const { id } = req;
  //   const subscribersOnAuthors = await prisma.subscribersOnAuthors.findMany({
  //     where: {
  //       subscriberId: id,
  //     },
  //     include: {
  //       author: true,
  //     },
  //   });
  //   return subscribersOnAuthors;
  // },

  createUser: async (req: ExtendedRequest) => {
    const { name, balance } = req.dto as CreateUserInput;
    const user: User = await prisma.user.create({
      data: {
        name,
        balance,
      },
    });
    return user;
  },

  createPost: async (req: ExtendedRequest) => {
    const { title, content, authorId } = req.dto as CreatePostInput;
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
    const { isMale, yearOfBirth, userId, memberTypeId } = req.dto as CreateProfileInput;
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

  deleteUser: async (req: ExtendedRequest) => {
    const { id } = req;
    await prisma.user.delete({
      where: {
        id,
      },
    });
  },

  deletePost: async (req: ExtendedRequest) => {
    const { id } = req;
    await prisma.post.delete({
      where: {
        id,
      },
    });
  },

  deleteProfile: async (req: ExtendedRequest) => {
    const { id } = req;
    await prisma.profile.delete({
      where: {
        id,
      },
    });
  },
  changePost: async (req: ExtendedRequest) => {
    const { id } = req;
    const { title, content } = req.dto as CreatePostInput;
    return await prisma.post.update({
      where: {
        id,
      },
      data: {
        title,
        content,
      },
    });
  },

  changeProfile: async (req: ExtendedRequest) => {
    const { id } = req;
    const { isMale, yearOfBirth, memberTypeId } = req.dto as CreateProfileInput;
    return await prisma.profile.update({
      where: {
        id,
      },
      data: {
        isMale,
        yearOfBirth,
        memberTypeId,
      },
    });
  },

  changeUser: async (req: ExtendedRequest) => {
    const { id } = req;
    const { name, balance } = req.dto as CreateUserInput;
    return await prisma.user.update({
      where: {
        id,
      },
      data: {
        name,
        balance,
      },
    });
  },
};
