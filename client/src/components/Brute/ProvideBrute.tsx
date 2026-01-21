import React, { useEffect } from 'react';
import { Outlet, useParams } from 'react-router';
import Server from '../../utils/Server';
import { useBrute } from '../../hooks/useBrute';
import { getCalculatedBrute, TemporarySkillEffect, TemporaryWeaponEffect } from '@labrute/core';
import { useAuth } from '../../hooks/useAuth';

/**
 * ProvideBrute component
 */
const ProvideBrute = () => {
  const { bruteName } = useParams();
  const { updateBrute } = useBrute();
  const { modifiers, user } = useAuth();

  // Fetch brute
  useEffect(() => {
    if (!bruteName) return;

    Server.Brute.getForHook(bruteName).then((data) => {
      const ownedBrute = user?.brutes.find((b) => (
        b.id === data.id || b.name.toLowerCase() === bruteName.toLowerCase()
      ));
      const calculated = getCalculatedBrute(data, modifiers);
      const tempSkills = data.temporarySkills
        ?? ownedBrute?.temporarySkills ?? [];
      const tempWeapons = data.temporaryWeapons
        ?? ownedBrute?.temporaryWeapons ?? [];
      updateBrute({
        ...calculated,
        temporarySkills: tempSkills,
        temporaryWeapons: tempWeapons,
      });
    }).catch(() => {
      window.location.href = '/unknown-brute';
    });
  }, [bruteName, updateBrute, modifiers, user]);
  return (
    <Outlet />
  );
};

export default ProvideBrute;
