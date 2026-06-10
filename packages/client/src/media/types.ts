export interface MediaItem {
	id: string;
	name: string;
	folderId: string | null;
	mime: string;
	size: number;
	url: string;
	sizes: Record<string, string>;
	alt: string | null;
	createdAt: string;
}

export interface MediaFolder {
	id: string;
	name: string;
	parentId: string | null;
}

export interface MediaListResponse {
	data: MediaItem[];
	total: number;
	page: number;
	perPage: number;
}
