declare module 'httpntlm' {
  export type NtlmOptions = {
    url: string;
    username?: string;
    password?: string;
    domain?: string;
    workstation?: string;
    headers?: Record<string, string>;
  };

  export type NtlmResponse = {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
  };

  export type NtlmCallback = (err: Error | null, response: NtlmResponse) => void;

  const httpntlm: {
    get(options: NtlmOptions, callback: NtlmCallback): void;
  };

  export default httpntlm;
}
