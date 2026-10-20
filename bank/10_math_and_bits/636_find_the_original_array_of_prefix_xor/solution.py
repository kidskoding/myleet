def find_array(pref: list[int]) -> list[int]:
    return [pref[0]] + [pref[i] ^ pref[i - 1] for i in range(1, len(pref))]
