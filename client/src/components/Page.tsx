import { Box, BoxProps } from '@mui/material';
import React, { useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import Header from './Header';
import { SEO } from './SEO';

interface Props extends BoxProps {
  title: string,
  description?: string,
  headerUrl?: string,
  children: React.ReactNode;
  sx?: BoxProps['sx'];
}

const Page = ({
  title,
  description,
  headerUrl,
  children,
  sx,
  ...rest
}: Props) => {
  const { authing, signin, user } = useAuth();
  const signinInitiated = useRef(false);

  // Auth on page load
  useEffect(() => {
    if (!user && !authing && !signinInitiated.current) {
      signinInitiated.current = true;
      signin();
    }
  }, [authing, signin, user]);

  return (
    <Box
      sx={{
        pb: 2,
        ...sx,
      }}
      {...rest}
    >
      <SEO
        title={title}
        description={description}
      />
      {/* HEADER */}
      <Header url={headerUrl} />
      {children}
    </Box>
  );
};

export default Page;
