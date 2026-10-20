from solution import reorganize_string


def test_reorganize_string_possible():
    result = reorganize_string("aab")

    assert sorted(result) == sorted("aab")
    assert all(result[i] != result[i + 1] for i in range(len(result) - 1))


def test_reorganize_string_impossible():
    assert reorganize_string("aaab") == ""
