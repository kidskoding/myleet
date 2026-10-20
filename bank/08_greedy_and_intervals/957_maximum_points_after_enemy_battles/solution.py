def maximum_points(enemy_energies: list[int], current_energy: int) -> int:
    weakest = min(enemy_energies)
    if current_energy < weakest:
        return 0
    return (current_energy + sum(enemy_energies) - weakest) // weakest
