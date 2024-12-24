export interface ApiResponse {
    _total_items: number;
    _page: number;
    _page_count: number;
    _links: {
        self: { href: string };
        next: { href: string };
        last: { href: string };
    };
    _embedded: {
        custom_fields: CustomField[];
    };
};


type CustomField = {
    id: number;
    name: string;
    sort: number;
    type: "text" | "date" | string;
    is_api_only: boolean;
    group_id: number | null;
    _links: {
        self: { href: string }; // Ссылка на само поле в API
    };
};
