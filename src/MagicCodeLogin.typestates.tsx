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
  Anchor,
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
        const storedEmail = localStorage.getItem("email");
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
      case "success": {
        localStorage.removeItem("email");
        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
        break;
      }
    }
  }, [state.phase]);

  const handleEmailSubmit = async (email: string): Promise<void> => {
    transition({ phase: "submitting-email", email });

    const res = await apiClient.requestMagicCode(email);
    if (res.ok) {
      localStorage.setItem("email", email);
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

    const res = await apiClient.verifyMagicCode({ email: state.email, code });
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

  const handleWrongEmail = (): void => {
    if (state.phase !== "awaiting-code-input") return;

    localStorage.removeItem("email");
    transition({ phase: "awaiting-email-input", email: null, error: null });
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
          onWrongEmail={handleWrongEmail}
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
  onWrongEmail: () => void;
}> = ({ onSubmit, email, error, onInput, onWrongEmail }) => {
  return (
    <Stack align="center">
      <Text>
        Please enter the code we sent to <strong>{email}</strong> (
        <Anchor component="button" onClick={onWrongEmail}>
          wrong email?
        </Anchor>
        )
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

const apiClient = {
  async requestMagicCode(
    email: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    await sleep(1000);
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
    await sleep(1000);
    if (code === "12345") {
      return { ok: true };
    } else {
      return { ok: false, error: "invalid code" };
    }
  },
};
