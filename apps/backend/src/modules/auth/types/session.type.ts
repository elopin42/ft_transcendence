
export type CreateSessionContext = {
	userId: number;
	email: string;
	ipAddress: string;
	userAgent: string;
	parentSessionId?: number; // pour rotation (chaînage)
	twoFactorPending?: boolean;
};

export type CreatedSession = {
	accessToken: string;
	refreshToken: string; // brut, à mettre en cookie côté controller
	sessionId: number;
	userId: number;
};

export type LoginResult =
	| { status: 'authenticated'; session: CreatedSession }
	| { status: 'requires_2fa'; session: CreatedSession }; // requires_2fa = twoFactorPending
