from list_node import ListNode
from solution import modified_list


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


def test_modified_list_removes_matching():
    assert to_list(modified_list([1, 2, 3], build_list([1, 2, 3, 4, 5]))) == [4, 5]


def test_modified_list_removes_head():
    assert to_list(modified_list([1], build_list([1, 2, 1, 2, 1, 2]))) == [2, 2, 2]


def test_modified_list_removes_all():
    assert modified_list([1, 2], build_list([1, 2, 1])) is None


def test_modified_list_removes_none():
    assert to_list(modified_list([9], build_list([1, 2, 3]))) == [1, 2, 3]
