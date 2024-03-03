import { Type } from '@fastify/type-provider-typebox';
import { PrismaClient, User, Profile, Post, MemberType } from '@prisma/client';
import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLFloat,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql';
import {
  ICreateProfileInput,
  ICreateUserInput,
  ICreatePostInput,
} from './types/types.js';
import { UUIDType } from './types/uuid.js';

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

export const prisma = new PrismaClient();

const MemberTypeId = new GraphQLEnumType({
  name: 'MemberTypeId',
  values: {
    basic: { value: 'basic' },
    business: { value: 'business' },
  },
});

const MemberType = new GraphQLObjectType({
  name: 'MemberType',
  fields: () => ({
    id: { type: MemberTypeId },
    discount: { type: GraphQLFloat },
    postsLimitPerMonth: { type: GraphQLInt },
    profiles: { type: new GraphQLList(ProfileType) },
  }),
});

const UserType = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: { type: UUIDType },
    name: { type: GraphQLString },
    balance: { type: GraphQLString },
    profile: { type: ProfileType as GraphQLObjectType<Profile> },
    posts: { type: new GraphQLList(PostType) },
    userSubscribedTo: {
      type: new GraphQLList(UserType),
      resolve: async (parent) => {
        const { id } = parent as { id: string };
        const users = await prisma.user.findMany({
          where: {
            subscribedToUser: {
              some: {
                subscriberId: id,
              },
            },
          },
        });
        return users;
      },
    },
    subscribedToUser: {
      type: new GraphQLList(UserType),
      resolve: async (parent) => {
        const { id } = parent as { id: string };
        const users = await prisma.user.findMany({
          where: {
            userSubscribedTo: {
              some: {
                authorId: id,
              },
            },
          },
        });
        return users;
      },
    },
  }),
});

const ProfileType = new GraphQLObjectType({
  name: 'Profile',
  fields: () => ({
    id: { type: UUIDType },
    isMale: { type: GraphQLBoolean },
    yearOfBirth: { type: GraphQLInt },
    user: { type: UserType as GraphQLObjectType<User> },
    memberType: { type: MemberType as GraphQLObjectType<MemberType> },
    memberTypeId: { type: MemberTypeId },
    userId: { type: UUIDType },
  }),
});

const PostType = new GraphQLObjectType({
  name: 'Post',
  fields: () => ({
    id: { type: UUIDType },
    title: { type: GraphQLString },
    content: { type: GraphQLString },
    author: { type: UserType as GraphQLObjectType<User> },
  }),
});

const Query = new GraphQLObjectType({
  name: 'Query',
  fields: {
    user: {
      type: UserType as GraphQLObjectType<User>,
      args: {
        id: { type: UUIDType },
      },
      resolve: async (_, args) => {
        const { id } = args as { id: string };
        const user = await prisma.user.findUnique({
          where: {
            id,
          },
          include: {
            profile: {
              include: {
                memberType: true,
              },
            },
            posts: true,
            userSubscribedTo: true,
            subscribedToUser: true,
          },
        });
        return user;
      },
    },
    users: {
      type: new GraphQLList(UserType),
      resolve: async () => {
        const users = await prisma.user.findMany({
          include: {
            profile: {
              include: {
                memberType: true,
              },
            },
            posts: true,
            userSubscribedTo: true,
            subscribedToUser: true,
          },
        });
        return users;
      },
    },
    post: {
      type: PostType as GraphQLObjectType<Post>,
      args: {
        id: { type: UUIDType },
      },
      resolve: async (parent, args) => {
        const { id } = args as { id: string };
        const post = await prisma.post.findUnique({
          where: {
            id,
          },
        });
        return post;
      },
    },
    posts: {
      type: new GraphQLList(PostType),
      resolve: async () => {
        const posts = await prisma.post.findMany();
        return posts;
      },
    },
    profile: {
      type: ProfileType as GraphQLObjectType<Profile>,
      args: {
        id: { type: UUIDType },
      },
      resolve: async (parent, args) => {
        const { id } = args as { id: string };
        const profile = await prisma.profile.findUnique({
          where: {
            id,
          },
        });
        return profile;
      },
    },
    profiles: {
      type: new GraphQLList(ProfileType),
      resolve: async () => {
        const profiles = await prisma.profile.findMany();
        return profiles;
      },
    },
    memberType: {
      type: MemberType as GraphQLObjectType<MemberType>,
      args: {
        id: { type: MemberTypeId },
      },
      resolve: async (parent, args) => {
        const { id } = args as { id: string };
        const memberType = await prisma.memberType.findUnique({
          where: {
            id,
          },
        });
        return memberType;
      },
    },
    memberTypes: {
      type: new GraphQLList(MemberType),
      resolve: async () => {
        const memberTypes = await prisma.memberType.findMany();
        return memberTypes;
      },
    },
    subscribedToUser: {
      type: new GraphQLList(UserType),
      args: {
        id: { type: UUIDType },
      },
      resolve: async (parent, args) => {
        const { id } = args as { id: string };
        const users = await prisma.user.findMany({
          where: {
            userSubscribedTo: {
              some: {
                authorId: id,
              },
            },
          },
        });
        return users;
      },
    },
    userSubscribedTo: {
      type: new GraphQLList(UserType),
      args: {
        id: { type: UUIDType },
      },
      resolve: async (parent, args) => {
        const { id } = args as { id: string };
        const users = await prisma.user.findMany({
          where: {
            subscribedToUser: {
              some: {
                subscriberId: id,
              },
            },
          },
        });
        return users;
      },
    },
  },
});

const CreatePostInput = new GraphQLInputObjectType({
  name: 'CreatePostInput',
  fields: {
    title: { type: new GraphQLNonNull(GraphQLString) },
    content: { type: new GraphQLNonNull(GraphQLString) },
    authorId: { type: new GraphQLNonNull(GraphQLString) },
  },
});

const CreateUserInput = new GraphQLInputObjectType({
  name: 'CreateUserInput',
  fields: {
    name: { type: new GraphQLNonNull(GraphQLString) },
    balance: { type: new GraphQLNonNull(GraphQLFloat) },
  },
});

const CreateProfileInput = new GraphQLInputObjectType({
  name: 'CreateProfileInput',
  fields: {
    isMale: { type: new GraphQLNonNull(GraphQLBoolean) },
    yearOfBirth: { type: new GraphQLNonNull(GraphQLInt) },
    userId: { type: new GraphQLNonNull(GraphQLString) },
    memberTypeId: { type: new GraphQLNonNull(MemberTypeId) },
  },
});

const ChangeUserInput = new GraphQLInputObjectType({
  name: 'ChangeUserInput',
  fields: {
    name: { type: GraphQLString },
    balance: { type: GraphQLFloat },
    profileId: { type: GraphQLString },
  },
});

const ChangePostInput = new GraphQLInputObjectType({
  name: 'ChangePostInput',
  fields: {
    title: { type: GraphQLString },
    content: { type: GraphQLString },
  },
});

const ChangeProfileInput = new GraphQLInputObjectType({
  name: 'ChangeProfileInput',
  fields: {
    isMale: { type: GraphQLBoolean },
    yearOfBirth: { type: GraphQLInt },
  },
});

const Mutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    createPost: {
      type: PostType as GraphQLObjectType<Post>,
      args: { dto: { type: CreatePostInput } },
      resolve: async (_, { dto }) => {
        console.log(dto);
        const { title, content, authorId } = dto as ICreatePostInput;
        const post = await prisma.post.create({
          data: {
            title,
            content,
            authorId,
          },
        });
        return post;
      },
    },
    createUser: {
      type: UserType as GraphQLObjectType<User>,
      args: { dto: { type: CreateUserInput } },
      resolve: async (_, { dto }) => {
        console.log(dto);
        const { name, balance } = dto as ICreateUserInput;
        const user = await prisma.user.create({
          data: {
            name,
            balance,
          },
        });
        return user;
      },
    },
    createProfile: {
      type: ProfileType as GraphQLObjectType<Profile>,
      args: { dto: { type: CreateProfileInput } },
      resolve: async (_, { dto }) => {
        console.log(dto);
        const { isMale, yearOfBirth, userId, memberTypeId } = dto as ICreateProfileInput;
        const profile = await prisma.profile.create({
          data: {
            isMale,
            yearOfBirth,
            userId,
            memberTypeId,
          },
        });
        return profile;
      },
    },
    deleteUser: {
      type: UUIDType,
      args: { id: { type: new GraphQLNonNull(UUIDType) } },
      resolve: async (_, args) => {
        const { id } = args as { id: string };
        await prisma.user.delete({
          where: {
            id,
          },
        });
      },
    },
    deletePost: {
      type: UUIDType,
      args: { id: { type: new GraphQLNonNull(UUIDType) } },
      resolve: async (_, args) => {
        const { id } = args as { id: string };
        await prisma.post.delete({
          where: {
            id,
          },
        });
      },
    },
    deleteProfile: {
      type: UUIDType,
      args: { id: { type: new GraphQLNonNull(UUIDType) } },
      resolve: async (_, args) => {
        const { id } = args as { id: string };
        await prisma.profile.delete({
          where: {
            id,
          },
        });
      },
    },
    changeUser: {
      type: UserType as GraphQLObjectType<User>,
      args: {
        id: { type: new GraphQLNonNull(UUIDType) },
        dto: { type: ChangeUserInput },
      },
      resolve: async (_, { id, dto }) => {
        const { name, balance } = dto as ICreateUserInput;
        return await prisma.user.update({
          where: {
            id: id as string,
          },
          data: {
            name,
            balance,
          },
        });
      },
    },
    changePost: {
      type: PostType as GraphQLObjectType<Post>,
      args: {
        id: { type: new GraphQLNonNull(UUIDType) },
        dto: { type: ChangePostInput },
      },
      resolve: async (_, { id, dto }) => {
        const { title, content } = dto as ICreatePostInput;
        return await prisma.post.update({
          where: {
            id: id as string,
          },
          data: {
            title,
            content,
          },
        });
      },
    },
    changeProfile: {
      type: ProfileType as GraphQLObjectType<Profile>,
      args: {
        id: { type: new GraphQLNonNull(UUIDType) },
        dto: { type: ChangeProfileInput },
      },
      resolve: async (_, { id, dto }) => {
        const { isMale, yearOfBirth } = dto as ICreateProfileInput;
        return await prisma.profile.update({
          where: {
            id: id as string,
          },
          data: {
            isMale,
            yearOfBirth,
          },
        });
      },
    },

    subscribeTo: {
      type: UserType as GraphQLObjectType<User>,
      args: {
        userId: { type: new GraphQLNonNull(UUIDType) },
        authorId: { type: new GraphQLNonNull(UUIDType) },
      },
      resolve: async (_, args) => {
        const { userId, authorId } = args as { userId: string; authorId: string };
        const subscribedUser = await prisma.user.update({
          where: {
            id: userId,
          },
          data: {
            userSubscribedTo: {
              create: {
                authorId,
              },
            },
          },
          include: {
            profile: true,
          },
        });
        return subscribedUser;
      },
    },
    unsubscribeFrom: {
      type: GraphQLString,
      args: {
        userId: { type: new GraphQLNonNull(UUIDType) },
        authorId: { type: new GraphQLNonNull(UUIDType) },
      },
      resolve: async (_, args) => {
        const { userId, authorId } = args as { userId: string; authorId: string };
        await prisma.subscribersOnAuthors.delete({
          where: {
            subscriberId_authorId: {
              subscriberId: userId,
              authorId: authorId,
            },
          },
        });
        return 'Successfully unsubscribed';
      },
    },
  },
});

export const schema = new GraphQLSchema({
  query: Query,
  mutation: Mutation,
});