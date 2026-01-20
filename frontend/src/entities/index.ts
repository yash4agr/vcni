/**
 * Auto-generated entity types
 * Contains all CMS collection interfaces in a single file 
 */

/**
 * Collection ID: actionwidgets
 * Interface for ActionWidgets
 */
export interface ActionWidgets {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  widgetType?: string;
  /** @wixFieldType text */
  displayName?: string;
  /** @wixFieldType text */
  configurationJson?: string;
  /** @wixFieldType image - Contains image URL, render with <Image> component, NOT as text */
  visualAsset?: string;
  /** @wixFieldType text */
  description?: string;
  /** @wixFieldType boolean */
  isActive?: boolean;
}


/**
 * Collection ID: commandhistory
 * Interface for CommandHistory
 */
export interface CommandHistory {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  commandText?: string;
  /** @wixFieldType datetime */
  processedAt?: Date | string;
  /** @wixFieldType text */
  detectedIntent?: string;
  /** @wixFieldType text */
  actionResult?: string;
  /** @wixFieldType text */
  status?: string;
}
