from solution import split_message


def test_split_message_example_one():
    assert split_message("this is really a very awesome message", 9) == [
        "thi<1/14>",
        "s i<2/14>",
        "s r<3/14>",
        "eal<4/14>",
        "ly <5/14>",
        "a v<6/14>",
        "ery<7/14>",
        " aw<8/14>",
        "eso<9/14>",
        "me<10/14>",
        " m<11/14>",
        "es<12/14>",
        "sa<13/14>",
        "ge<14/14>",
    ]


def test_split_message_example_two():
    assert split_message("short message", 15) == ["short mess<1/2>", "age<2/2>"]


def test_split_message_impossible_tiny_limit():
    assert split_message("hello", 3) == []


def test_split_message_single_part():
    assert split_message("ab", 7) == ["ab<1/1>"]


def test_split_message_concat_recovers():
    parts = split_message("abcdefghij", 8)
    body = "".join(p[: p.index("<")] for p in parts)
    assert body == "abcdefghij"
