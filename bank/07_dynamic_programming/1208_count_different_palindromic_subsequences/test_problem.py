from solution import count_palindromic_subsequences


def test_count_palindromic_subsequences_example_one():
    assert count_palindromic_subsequences("bccb") == 6


def test_count_palindromic_subsequences_example_two():
    assert (
        count_palindromic_subsequences(
            "abcdabcdabcdabcdabcdabcdabcdabcddcbadcbadcbadcbadcbadcbadcbadcba"
        )
        == 104860361
    )


def test_count_palindromic_subsequences_single():
    assert count_palindromic_subsequences("a") == 1


def test_count_palindromic_subsequences_two_same():
    assert count_palindromic_subsequences("aa") == 2
