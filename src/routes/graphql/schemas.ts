import { Type } from '@fastify/type-provider-typebox';
import { User, Profile, Post, MemberType, PrismaClient } from '@prisma/client';
import {
  FieldNode,
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
import Dataloader from 'dataloader';

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
    profile: {
      type: ProfileType as GraphQLObjectType<Profile>,
      resolve: async (parent: User, args, context, info) => {
        const { dataloaders, prisma } = context as {
          dataloaders: WeakMap<
            ReadonlyArray<FieldNode>,
            Dataloader<string, Profile | undefined>
          >;
          prisma: PrismaClient;
        };

        let dataloader = dataloaders.get(info.fieldNodes);

        if (!dataloader) {
          dataloader = new Dataloader(async (ids) => {
            const profiles = await prisma.profile.findMany({
              where: {
                userId: {
                  in: ids as string[],
                },
              },
            });
            const sortedInIdsProfiles = ids.map((id) =>
              profiles.find((p) => p.userId === id),
            );
            return sortedInIdsProfiles;
          });
          dataloaders.set(info.fieldNodes, dataloader);
        }
        return dataloader.load(parent.id);
      },
    },
    posts: {
      type: new GraphQLList(PostType),
      resolve: async (parent: User, args, context, info) => {
        const { prisma, dataloaders } = context as {
          dataloaders: WeakMap<ReadonlyArray<FieldNode>, Dataloader<string, Post[]>>;
          prisma: PrismaClient;
        };

        let dataloader = dataloaders.get(info.fieldNodes);

        if (!dataloader) {
          dataloader = new Dataloader(async (ids) => {
            const posts = await prisma.post.findMany({
              where: {
                authorId: {
                  in: ids as string[],
                },
              },
            });
            const sortedInIdsPost = ids.map((id) =>
              posts.filter((p) => p.authorId === id),
            );
            return sortedInIdsPost;
          });
          dataloaders.set(info.fieldNodes, dataloader);
        }
        return dataloader.load(parent.id);
      },
    },
    // ------------------------------ userSubscribedTo ------------------------ 
    userSubscribedTo: {
      type: new GraphQLList(UserType),
      resolve: async (parent, args, context, info) => {
        const { prisma, dataloaders } = context as {
          prisma: PrismaClient;
          dataloaders: WeakMap<ReadonlyArray<FieldNode>, Dataloader<string, User[]>>;
        };
        // -----------------------------------------------------
        // const users = await prisma.user.findMany({
        //   where: {
        //     subscribedToUser: {
        //       some: {
        //         subscriberId: parent.id,
        //       },
        //     },
        //   },
        //   include: {
        //     userSubscribedTo: true,
        //     subscribedToUser: true,
        //   }
        // });
        // console.log('users from old resolver');
        // console.log(users);
        // return users;
        // -----------------------------------------------------

        let dataloader = dataloaders.get(info.fieldNodes);

        if (!dataloader) {
          dataloader = new Dataloader(async (ids) => {
            console.log('ids');
            console.log(ids);
            const users = await prisma.user.findMany({
              where: {
                subscribedToUser: {
                  some: {
                    subscriberId: {
                      in: ids as string[],
                    },
                  },
                },
              },
              include: {
                userSubscribedTo: true,
                subscribedToUser: true,
              }
            });

            const sortedInIdsUsers = ids.map((id) => {
              const subscribedToUsers = users.filter((u) => u.subscribedToUser.some((su) => su.subscriberId === id));
              return subscribedToUsers;
            });

            console.log('sortedInIdsUsers');
            console.log(sortedInIdsUsers);
            return sortedInIdsUsers;
          });
          dataloaders.set(info.fieldNodes, dataloader);
        }
        return dataloader.load(parent.id);
      },
    },
    // ------------------------------ subscribedToUser ------------------------ 
    subscribedToUser: {
      type: new GraphQLList(UserType),
      resolve: async (parent, args, context, info) => {
        const { prisma, dataloaders } = context as {
          prisma: PrismaClient;
          dataloaders: WeakMap<ReadonlyArray<FieldNode>, Dataloader<string, User[]>>;
        };
        //---------------------------------------------------
        // const users = await prisma.user.findMany({
        //   where: {
        //     userSubscribedTo: {
        //       some: {
        //         authorId: parent.id,
        //       },
        //     },
        //   },
        // });
        // return users;
        //---------------------------------------------------

        let dataloader = dataloaders.get(info.fieldNodes);

        if (!dataloader) {
          (dataloader = new Dataloader(async (ids) => {
            const users = await prisma.user.findMany({
              where: {
                userSubscribedTo: {
                  some: {
                    authorId: {
                      in: ids as string[],
                    },
                  },
                },
              },
              include: {
                subscribedToUser: true,
                userSubscribedTo: true,
              },
            });
            const sortedInIdsUsers = ids.map((id) => {
              const subscribedToUsers = users.filter((u) => u.userSubscribedTo.some((su) => su.authorId === id));
              return subscribedToUsers;
            });
            return sortedInIdsUsers;
          })),
            dataloaders.set(info.fieldNodes, dataloader);
        }
        return dataloader.load(parent.id);
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
    memberType: {
      type: MemberType as GraphQLObjectType<MemberType>,
      resolve: async (parent: Profile, args, context, info) => {
        const { prisma, dataloaders } = context as {
          dataloaders: WeakMap<
            ReadonlyArray<FieldNode>,
            Dataloader<string, MemberType | undefined>
          >;
          prisma: PrismaClient;
        };

        let dataloader = dataloaders.get(info.fieldNodes);

        if (!dataloader) {
          dataloader = new Dataloader(async (ids) => {
            const memberTypes = await prisma.memberType.findMany({
              where: {
                profiles: {
                  some: {
                    id: {
                      in: ids as string[],
                    },
                  },
                },
              },
              include: {
                profiles: true,
              },
            });
            const sortedInIdsMemberTypes = ids.map((id) =>
              memberTypes.find(
                (p) => p.id === p.profiles.find((p) => p.id === id)?.memberTypeId,
              ),
            );
            return sortedInIdsMemberTypes;
          });
          dataloaders.set(info.fieldNodes, dataloader);
        }
        return dataloader.load(parent.id);
      },
    },
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
      resolve: async (_, args, context) => {
        const { prisma } = context as { prisma: PrismaClient };
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
      resolve: async (parent, args, context) => {
        const { prisma } = context as { prisma: PrismaClient };
        const users = await prisma.user.findMany({
          include: {
            profile: true,
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
      resolve: async (parent, args, context) => {
        const { prisma } = context as { prisma: PrismaClient };
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
      resolve: async (parent, args, context) => {
        const { prisma } = context as { prisma: PrismaClient };
        const posts = await prisma.post.findMany();
        return posts;
      },
    },
    profile: {
      type: ProfileType as GraphQLObjectType<Profile>,
      args: {
        id: { type: UUIDType },
      },
      resolve: async (parent, args, context) => {
        const { prisma } = context as { prisma: PrismaClient };
        const { id } = args as { id: string };
        const profile = await prisma.profile.findUnique({
          where: {
            id,
          },
          include: {
            memberType: true,
          },
        });
        return profile;
      },
    },
    profiles: {
      type: new GraphQLList(ProfileType),
      resolve: async (parent, args, context) => {
        const { prisma } = context as { prisma: PrismaClient };
        const profiles = await prisma.profile.findMany({
          include: {
            memberType: true,
          },
        });
        return profiles;
      },
    },
    memberType: {
      type: MemberType as GraphQLObjectType<MemberType>,
      args: {
        id: { type: MemberTypeId },
      },
      resolve: async (parent, args, context) => {
        const { prisma } = context as { prisma: PrismaClient };
        const { id } = args as { id: string };
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
    },
    memberTypes: {
      type: new GraphQLList(MemberType),
      resolve: async (parent, args, context) => {
        const { prisma } = context as { prisma: PrismaClient };
        const memberTypes = await prisma.memberType.findMany();
        return memberTypes;
      },
    },
    subscribedToUser: {
      type: new GraphQLList(UserType),
      args: {
        id: { type: UUIDType },
      },
      resolve: async (parent, args, context) => {
        const { prisma } = context as { prisma: PrismaClient };
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
      resolve: async (parent, args, context) => {
        const { prisma } = context as { prisma: PrismaClient };
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
      resolve: async (_, { dto }, { prisma }: { prisma: PrismaClient }) => {
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
      resolve: async (_, { dto }, { prisma }: { prisma: PrismaClient }) => {
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
      resolve: async (_, { dto }, { prisma }: { prisma: PrismaClient }) => {
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
      resolve: async (_, args, { prisma }: { prisma: PrismaClient }) => {
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
      resolve: async (_, args, { prisma }: { prisma: PrismaClient }) => {
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
      resolve: async (_, args, { prisma }: { prisma: PrismaClient }) => {
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
      resolve: async (_, { id, dto }, { prisma }: { prisma: PrismaClient }) => {
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
      resolve: async (_, { id, dto }, { prisma }: { prisma: PrismaClient }) => {
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
      resolve: async (_, { id, dto }, { prisma }: { prisma: PrismaClient }) => {
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
      resolve: async (_, args, { prisma }: { prisma: PrismaClient }) => {
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
      resolve: async (_, args, { prisma }: { prisma: PrismaClient }) => {
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
