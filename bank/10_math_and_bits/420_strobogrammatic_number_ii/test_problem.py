from solution import find_strobogrammatic

ROTATE = {"0": "0", "1": "1", "6": "9", "8": "8", "9": "6"}


def is_strobo(s: str) -> bool:
    return all(c in ROTATE for c in s) and "".join(ROTATE[c] for c in reversed(s)) == s


def test_find_strobogrammatic_one():
    assert sorted(find_strobogrammatic(1)) == ["0", "1", "8"]


def test_find_strobogrammatic_two():
    assert sorted(find_strobogrammatic(2)) == ["11", "69", "88", "96"]


def test_find_strobogrammatic_three():
    assert sorted(find_strobogrammatic(3)) == [
        "101",
        "111",
        "181",
        "609",
        "619",
        "689",
        "808",
        "818",
        "888",
        "906",
        "916",
        "986",
    ]


def test_find_strobogrammatic_four_valid_and_unique():
    result = find_strobogrammatic(4)
    assert len(result) == 20
    assert len(set(result)) == 20
    assert all(len(s) == 4 and s[0] != "0" and is_strobo(s) for s in result)


def test_find_strobogrammatic_five_count():
    result = find_strobogrammatic(5)
    assert len(set(result)) == len(result) == 60
    assert all(len(s) == 5 and s[0] != "0" and is_strobo(s) for s in result)
