from solution import make_anti_palindrome


def test_make_anti_palindrome_example_one():
    assert make_anti_palindrome("abca") == "aabc"


def test_make_anti_palindrome_example_two():
    assert make_anti_palindrome("abba") == "aabb"


def test_make_anti_palindrome_impossible():
    assert make_anti_palindrome("cccd") == "-1"


def test_make_anti_palindrome_two_letters_same():
    assert make_anti_palindrome("zz") == "-1"


def test_make_anti_palindrome_middle_block_needs_swaps():
    assert make_anti_palindrome("abbbcd") == "abbcdb"


def test_make_anti_palindrome_already_sorted_works():
    assert make_anti_palindrome("dcba") == "abcd"
