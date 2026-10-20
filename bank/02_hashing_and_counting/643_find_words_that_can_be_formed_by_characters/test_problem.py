from solution import count_characters


def test_count_characters_example_one():
    assert count_characters(["cat", "bt", "hat", "tree"], "atach") == 6


def test_count_characters_example_two():
    assert count_characters(["hello", "world", "leetcode"], "welldonehoneyr") == 10


def test_count_characters_missing_letter():
    assert count_characters(["abc"], "ab") == 0


def test_count_characters_not_enough_copies():
    assert count_characters(["aa", "a"], "a") == 1


def test_count_characters_reuse_across_words():
    assert count_characters(["ab", "ba", "ab"], "ab") == 6
