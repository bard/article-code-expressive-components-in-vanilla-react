import sleep from "sleep-promise";
import { z } from "zod";
import React from "react";
import {
  Button,
  Container,
  PinInput,
  TextInput,
  Text,
  Stack,
} from "@mantine/core";
import { useEffect, useState } from "react";

export const MagicCodeLogin: React.FC = () => {
  const [state, transition] = useState<
    | { phase: "mounting"; email: null }
    | {
        phase: "awaiting-email-input";
        email: null;
        error: null | string;
      }
    | { phase: "submitting-email"; email: string }
    | {
        phase: "awaiting-code-input";
        email: string;
        error: null | string;
      }
    | { phase: "submitting-code"; email: string; code: string }
    | { phase: "success" }
  >({ phase: "mounting", email: null });

  useEffect(() => {
    switch (state.phase) {
      case "mounting": {
        const { email: storedEmail } = io.readPersistedData();
        if (storedEmail === null) {
          transition({
            phase: "awaiting-email-input",
            email: null,
            error: null,
          });
        } else {
          transition({
            phase: "awaiting-code-input",
            email: storedEmail,
            error: null,
          });
        }
        break;
      }
      case "awaiting-code-input": {
        // Enact state change without phase change: save email to recover it in
        // case the user reloads the page
        transition((s) => {
          if (s.phase !== "awaiting-code-input") throw new Error("Bug");
          io.persistData({ email: s.email });
          return s;
        });
        break;
      }
      case "success": {
        io.codeWasAccepted();
        break;
      }
    }

    const unsubscribeFromPersistedDataChanges =
      io.subscribeToPersistedDataChanges((oldData, newData) => {
        if (newData.email !== null && oldData.email === null) {
          transition({
            phase: "awaiting-code-input",
            email: newData.email,
            error: null,
          });
        } else {
          transition({
            phase: "awaiting-email-input",
            email: null,
            error: null,
          });
        }
      });

    return unsubscribeFromPersistedDataChanges;
  }, [state.phase]);

  const handleEmailSubmit = async (email: string): Promise<void> => {
    transition({ phase: "submitting-email", email });

    const res = await io.requestMagicCode({ email });
    if (res.ok) {
      transition({ phase: "awaiting-code-input", email, error: null });
    } else {
      transition({
        phase: "awaiting-email-input",
        email: null,
        error: res.error,
      });
    }
  };

  const handleCodeSubmit = async (code: string): Promise<void> => {
    if (state.phase !== "awaiting-code-input") return;

    transition({ phase: "submitting-code", email: state.email, code });

    const res = await io.verifyMagicCode({ email: state.email, code });

    if (res.ok) {
      transition({ phase: "success" });
    } else {
      transition({
        phase: "awaiting-code-input",
        email: state.email,
        error: res.error,
      });
    }
  };

  const handleCodeInput = (): void => {
    if (state.phase !== "awaiting-code-input") return;

    if (state.error !== null) {
      transition({ ...state, error: null });
    }
  };

  return (
    <Container size="xs" py="xl">
      {state.phase === "awaiting-email-input" ||
      state.phase === "submitting-email" ? (
        <EmailForm
          onSubmit={handleEmailSubmit}
          isSubmitting={state.phase === "submitting-email"}
          error={state.phase === "submitting-email" ? null : state.error}
        />
      ) : state.phase === "awaiting-code-input" ? (
        <CodeForm
          email={state.email}
          error={state.error}
          onSubmit={handleCodeSubmit}
          onInput={handleCodeInput}
        />
      ) : state.phase === "submitting-code" ? (
        <Text>Verifying...</Text>
      ) : state.phase === "success" ? (
        <Text>Success! Redirecting...</Text>
      ) : null}
    </Container>
  );
};

const EmailForm: React.FC<{
  onSubmit: (email: string) => void;
  isSubmitting: boolean;
  error: null | string;
}> = ({ onSubmit, isSubmitting, error }) => {
  const [email, setEmail] = useState("");

  const handleSubmit: React.FormEventHandler = (event): void => {
    event.preventDefault();
    onSubmit(email);
  };

  const handleEmailChange: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ): void => {
    setEmail(event.target.value);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap={10} w="100%">
        <TextInput
          withAsterisk
          label="Your email"
          placeholder="Your email"
          disabled={isSubmitting}
          onChange={handleEmailChange}
        />

        {error !== null && <Text c="red">{error}</Text>}

        <Button type="submit" loading={isSubmitting}>
          Get login code
        </Button>
      </Stack>
    </form>
  );
};

const CodeForm: React.FC<{
  email: string;
  error: null | string;
  onSubmit: (code: string) => void;
  onInput: () => void;
}> = ({ onSubmit, email, error, onInput }) => {
  return (
    <Stack align="center">
      <Text>
        Please enter the code we sent to <strong>{email}</strong>:
      </Text>

      <PinInput
        autoFocus
        oneTimeCode
        size="lg"
        length={5}
        onInput={onInput}
        onComplete={onSubmit}
      />

      {error !== null && <Text c="red">{error}</Text>}
    </Stack>
  );
};

interface MagicCodeLoginIo {
  requestMagicCode(params: {
    email: string;
  }): Promise<{ ok: true } | { ok: false; error: string }>;
  verifyMagicCode(params: {
    code: string;
    email: string;
  }): Promise<{ ok: true } | { ok: false; error: string }>;
  codeWasAccepted(): Promise<void>;
  persistData(params: { email: string }): void;
  readPersistedData(): { email: string | null };
  subscribeToPersistedDataChanges(
    listener: (
      oldValue: { email: string | null },
      newValue: { email: string | null },
    ) => void,
  ): () => void;
}

const apiClient = {
  async requestMagicCode(
    email: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    await sleep(1500);
    if (!z.string().email().safeParse(email).success) {
      return { ok: false, error: "invalid email" };
    } else {
      return { ok: true };
    }
  },

  async verifyMagicCode({
    code,
    email: _email,
  }: {
    email: string;
    code: string;
  }): Promise<{ ok: true } | { ok: false; error: string }> {
    await sleep(1500);
    if (code === "12345") {
      return { ok: true };
    } else {
      return { ok: false, error: "invalid code" };
    }
  },
};

const io: MagicCodeLoginIo = {
  async requestMagicCode({ email }) {
    return apiClient.requestMagicCode(email);
  },
  async verifyMagicCode({ email, code }) {
    return apiClient.verifyMagicCode({ email, code });
  },
  async codeWasAccepted() {
    await sleep(1500);
    window.location.href = "/";
  },
  persistData({ email }: { email: string }) {
    const hashParams = new URLSearchParams();
    hashParams.set("email", email);
    window.location.hash = hashParams.toString();
  },
  readPersistedData() {
    const hashParams = new URLSearchParams(
      window.location.hash.replace(/^#/, ""),
    );
    const { success, data } = z
      .string()
      .email()
      .safeParse(hashParams.get("email"));
    return success ? { email: data } : { email: null };
  },
  subscribeToPersistedDataChanges(listener) {
    const getEmailFromHash = (hash: string): null | string => {
      if (hash.startsWith("#email=")) {
        const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
        try {
          return z.string().email().parse(hashParams.get("email"));
        } catch (_err) {
          return null;
        }
      } else {
        return null;
      }
    };

    const hashListener = (e: HashChangeEvent): void => {
      const oldValue = { email: getEmailFromHash(new URL(e.oldURL).hash) };
      const newValue = { email: getEmailFromHash(new URL(e.newURL).hash) };
      listener(oldValue, newValue);
    };

    window.addEventListener("hashchange", hashListener);

    return () => {
      window.removeEventListener("hashchange", hashListener);
    };
  },
};
