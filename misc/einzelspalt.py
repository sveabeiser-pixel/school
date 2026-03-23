import numpy as np
import matplotlib.pyplot as plt

# Beobachtungskoordinate
u = np.linspace(-5, 5, 1500)

# Spaltkoordinate
t = np.linspace(-0.5, 0.5, 4000)
dt = t[1] - t[0]

# Randverstärkte Transmission (wie vorher)
eps = 1.0
T = 1.0 + eps * (2*np.abs(t) - 0.5)

# Feld berechnen (Vektorisierung ohne riesige Matrix)
I_mod = np.zeros_like(u)

for i, ui in enumerate(u):
    phase = np.exp(1j * 2*np.pi * ui * t)
    E = np.sum(T * phase) * dt
    I_mod[i] = np.abs(E)**2

# Normieren auf I(0)=1
I_mod /= I_mod[np.argmin(np.abs(u))]

plt.figure(figsize=(7,4))
plt.plot(u, I_mod)
plt.ylim(0,1.05)
plt.xlabel(r"normalized position $u = x / (\lambda L / d)$")
plt.ylabel(r"normalized intensity $I/I(0)$")
plt.title("Single slit with enhanced side maxima (normalized peak)")
plt.grid(True)
plt.show()
