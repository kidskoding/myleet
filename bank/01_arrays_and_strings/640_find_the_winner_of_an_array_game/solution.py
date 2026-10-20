def get_winner(arr: list[int], k: int) -> int:
    champion = arr[0]
    streak = 0
    for x in arr[1:]:
        if x > champion:
            champion = x
            streak = 1
        else:
            streak += 1
        if streak == k:
            return champion
    return champion
