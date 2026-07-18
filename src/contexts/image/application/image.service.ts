import { Image } from "@shared/types";
import { eventBus } from "@shared/events";
import { createImage, CreateImageProps } from "../domain/image";
import { imageRepository } from "../infrastructure/image.repository";

export const imageService = {
  byBacklogItem(backlogItemId: string): Image[] {
    return imageRepository.byBacklogItem(backlogItemId);
  },

  create(props: CreateImageProps): Image {
    const image = createImage(props);
    imageRepository.add(image);
    eventBus.emit("image:created", image);
    return image;
  },

  delete(id: string): void {
    imageRepository.remove(id);
    eventBus.emit("image:deleted", id);
  }
};
