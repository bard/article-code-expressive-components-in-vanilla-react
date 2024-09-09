import "@mantine/core/styles.css";
import React from "react";
import { Container, MantineProvider } from "@mantine/core";
import { MagicCodeLogin } from "./MagicCodeLogin.typestates";
//import { MagicCodeLogin } from "./MagicCodeLogin.typestates+io";

export const App: React.FC = () => {
  return (
    <MantineProvider defaultColorScheme="auto">
      <Container>
        <MagicCodeLogin />
      </Container>
    </MantineProvider>
  );
};
