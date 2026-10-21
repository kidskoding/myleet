from solution import are_sentences_similar


def test_are_sentences_similar_insert_middle():
    assert are_sentences_similar("My name is Haley", "My Haley") is True


def test_are_sentences_similar_false():
    assert are_sentences_similar("of", "A lot of words") is False


def test_are_sentences_similar_prefix():
    assert are_sentences_similar("Eating right now", "Eating") is True


def test_are_sentences_similar_identical():
    assert are_sentences_similar("a b c", "a b c") is True


def test_are_sentences_similar_suffix_only():
    assert are_sentences_similar("c", "a b c") is True
