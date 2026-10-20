from solution import compare_version


def test_compare_version_numeric_not_lexicographic():
    assert compare_version("1.2", "1.10") == -1


def test_compare_version_leading_zeros():
    assert compare_version("1.01", "1.001") == 0


def test_compare_version_trailing_zero_revisions():
    assert compare_version("1.0", "1.0.0.0") == 0


def test_compare_version_first_revision_decides():
    assert compare_version("0.1", "1.1") == -1


def test_compare_version_longer_is_greater():
    assert compare_version("1.0.1", "1") == 1
