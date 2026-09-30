const envVersion = import.meta.env.KERNEL_PACKAGE_VERSION as string | boolean | undefined;

export const KERNEL_PACKAGE_VERSION =
	typeof envVersion === 'string' && envVersion.length > 0 ? envVersion : '0.0.0';
