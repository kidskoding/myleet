from solution import count_palindromes


def test_count_palindromes_example_one():
    assert count_palindromes("103301") == 2


def test_count_palindromes_all_same():
    assert count_palindromes("0000000") == 21


def test_count_palindromes_two_blocks():
    assert count_palindromes("9999900000") == 2


def test_count_palindromes_too_short():
    assert count_palindromes("1") == 0


def test_count_palindromes_distinct_digits():
    assert count_palindromes("12345") == 0


def test_count_palindromes_exactly_five():
    assert count_palindromes("12321") == 1
