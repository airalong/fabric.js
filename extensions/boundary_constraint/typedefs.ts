export type ZoneRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type BoundaryConstraintConfig = {
  /** Named zones that objects can be constrained to */
  zones: Record<string, ZoneRect>;
  /** Whether to also constrain scaling (default: true) */
  constrainScaling: boolean;
};
