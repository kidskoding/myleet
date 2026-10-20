from list_node import ListNode
from solution import rotate_right


def build_list(values: list[int]) -> ListNode | None:
    dummy = ListNode()
    curr = dummy
    for value in values:
        curr.next = ListNode(value)
        curr = curr.next
    return dummy.next


def to_list(head: ListNode | None) -> list[int]:
    values = []
    while head:
        values.append(head.val)
        head = head.next
    return values


def test_rotate_right_basic():
    head = build_list([1, 2, 3, 4, 5])
    assert to_list(rotate_right(head, 2)) == [4, 5, 1, 2, 3]


def test_rotate_right_wraps_around():
    head = build_list([0, 1, 2])
    assert to_list(rotate_right(head, 4)) == [2, 0, 1]


def test_rotate_right_empty():
    assert rotate_right(None, 3) is None
