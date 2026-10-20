from solution import moves_to_stamp


def apply(stamp, length, moves):
    s = ["?"] * length
    for i in moves:
        assert 0 <= i <= length - len(stamp)
        s[i : i + len(stamp)] = stamp
    return "".join(s)


def check(stamp, target):
    moves = moves_to_stamp(stamp, target)
    assert 0 < len(moves) <= 10 * len(target)
    assert apply(stamp, len(target), moves) == target


def test_moves_to_stamp_example_one():
    check("abc", "ababc")


def test_moves_to_stamp_example_two():
    check("abca", "aabcaca")


def test_moves_to_stamp_exact_match():
    assert moves_to_stamp("abc", "abc") == [0]


def test_moves_to_stamp_letter_missing():
    assert moves_to_stamp("aa", "aba") == []


def test_moves_to_stamp_wrong_order():
    assert moves_to_stamp("ab", "ba") == []


def test_moves_to_stamp_single_letter_stamp():
    check("a", "aaaa")
