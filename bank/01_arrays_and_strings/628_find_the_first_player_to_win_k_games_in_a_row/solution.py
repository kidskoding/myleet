def find_winning_player(skills: list[int], k: int) -> int:
    champion, streak = 0, 0
    for i in range(1, len(skills)):
        if skills[i] > skills[champion]:
            champion, streak = i, 1
        else:
            streak += 1
        if streak == k:
            return champion
    return champion
